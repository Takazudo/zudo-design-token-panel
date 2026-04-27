/*
 * Apply-pipeline proxy — Next.js API route (DEV-ONLY).
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
 *      backend without CORS" surface in App Router, so the route is the
 *      right Next-shaped tool for the job — but it ships in production
 *      builds too. To keep the parity with vite-react's dev-only proxy
 *      (`vite.config.ts`'s `server.proxy` does not apply to production
 *      builds), this route SHORT-CIRCUITS to 404 in production. The
 *      apply pipeline is a developer-only surface — production builds of
 *      the example app must not expose a proxy to a localhost bin.
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
/**
 * The Origin header forwarded to the bin sidecar. The bin validates this
 * against its --allow-origin flag, so both must agree.
 *
 * Override via the ZDTP_BIN_ORIGIN environment variable when the panel is
 * served on a different port (e.g. `ZDTP_BIN_ORIGIN=http://localhost:3001`).
 */
const FORWARD_ORIGIN = process.env.ZDTP_BIN_ORIGIN ?? 'http://localhost:44326';
/** Soft body-size limit — mirrors the same constant in the bin sidecar. */
const MAX_BODY_BYTES = 1_048_576; // 1 MiB

export async function POST(request: Request): Promise<Response> {
  // Dev-only gate. `next dev` sets NODE_ENV=development; `next build` /
  // `next start` set NODE_ENV=production. In production, the route returns
  // 404 — same surface a non-existent route would return, so a curious
  // probe gets no signal that the dev proxy ever existed in the build.
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(
      JSON.stringify({ error: 'Payload Too Large', limit: MAX_BODY_BYTES }),
      { status: 413, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const body = await request.text();
  if (Buffer.byteLength(body, 'utf-8') > MAX_BODY_BYTES) {
    return new Response(
      JSON.stringify({ error: 'Payload Too Large', limit: MAX_BODY_BYTES }),
      { status: 413, headers: { 'Content-Type': 'application/json' } },
    );
  }
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
