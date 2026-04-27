/*
 * Apply-pipeline proxy — Next.js API route.
 *
 * Mirrors the proxy the Vite + React example installs in vite.config.ts:
 *
 *   panel POST -> /api/dev/apply -> bin sidecar at 127.0.0.1:24684/apply
 *
 * Why an API route (not direct CORS-allowed fetch from the panel to the bin)?
 *
 *   1. Same-origin POST means no CORS preflight. The panel issues a JSON
 *      `POST /api/dev/apply` against the same origin Next is serving the
 *      page on, the browser issues no OPTIONS request, the bin never has to
 *      reason about cross-origin headers, and the runtime config in
 *      `src/config/panel-config.ts` carries no port number — exactly the
 *      shape the vite-react example uses.
 *
 *   2. App Router has no built-in dev-server proxy config equivalent to
 *      Vite's `server.proxy`. An API route is the canonical "talk to a
 *      backend without CORS" surface in App Router, and the route file is
 *      idiomatic Next: it ships in production builds too (so the same
 *      apply pipeline is reachable from `next start` if a host wants to
 *      run the bin under a process supervisor).
 *
 *   3. The bin sidecar still validates the Origin header for safety, so
 *      this route forwards the request with `Origin: http://localhost:44326`
 *      regardless of what the incoming request had — the bin is started
 *      with `--allow-origin http://localhost:44326` in `pnpm dev`, which
 *      is the only origin the panel ever runs against during development.
 *
 * The implementation forwards the body bytes verbatim and the status code
 * verbatim. We don't try to parse, transform, or validate the JSON — the
 * bin owns the schema, this route is a transport-level adapter.
 */

const BIN_APPLY_URL = 'http://127.0.0.1:24684/apply';
const FORWARD_ORIGIN = 'http://localhost:44326';

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  const incomingContentType = request.headers.get('content-type') ?? 'application/json';

  let upstream: Response;
  try {
    upstream = await fetch(BIN_APPLY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': incomingContentType,
        Origin: FORWARD_ORIGIN,
      },
      body,
    });
  } catch (err) {
    // Surface a 502 when the bin sidecar is unreachable — same shape the
    // Vite proxy returns when its target connection fails. The panel UI
    // shows the response body in the apply-failure modal, so a clear
    // message here is actionable from the browser.
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        error: 'bin-sidecar-unreachable',
        message,
        target: BIN_APPLY_URL,
        hint: 'Run `pnpm --filter next-example dev` so the bin sidecar listens on port 24684.',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const upstreamBody = await upstream.text();
  return new Response(upstreamBody, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}
