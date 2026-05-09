// zfb plugin: dev-apply-proxy
//
// Intercepts POST /pj/zudo-design-token-panel/examples/zfb/api/dev/apply
// (the full base-prefixed path — see `zfb.config.ts` and README.md for why
// this differs from the bare `/api/dev/apply` the other three examples use)
// and forwards the request body verbatim to the bin sidecar running on
// http://127.0.0.1:24685/apply.
//
// Per zfb issue #229 (fixed in commit b1049ef), devMiddleware handlers are
// mounted under the project `base`. Registration at the full prefixed path
// is therefore required — a bare `/api/dev/apply` would never be reached.
//
// The plugin is dev-only. During `zfb build` the `devMiddleware` hook is
// not invoked, so the production static output has no dependency on this
// module or on the sidecar port.
//
// No npm dependencies: global `fetch` (available in Node 18+) is used to
// forward the request. The response status and body are piped back verbatim
// so the panel's apply-pipeline sees the same error codes the sidecar emits.

const BIN_SIDECAR_APPLY_URL = "http://127.0.0.1:24685/apply";

// The base prefix as a string constant — must match `zfb.config.ts`'s `base`
// field exactly (minus the trailing slash). Registered as a path prefix so
// zfb routes only POST /pj/zudo-design-token-panel/examples/zfb/api/dev/apply
// through this handler.
const APPLY_ROUTE = "/pj/zudo-design-token-panel/examples/zfb/api/dev/apply";

/** @type {import("@takazudo/zfb/plugins").ZfbPlugin} */
export default {
  name: "dev-apply-proxy",

  devMiddleware(ctx) {
    ctx.register(APPLY_ROUTE, async (req) => {
      if (req.method !== "POST") {
        // Only POST is valid for the apply endpoint; let other methods 405.
        return {
          status: 405,
          headers: { "content-type": "text/plain" },
          body: "Method Not Allowed",
        };
      }

      let upstreamResponse;
      try {
        upstreamResponse = await fetch(BIN_SIDECAR_APPLY_URL, {
          method: "POST",
          headers: {
            "content-type": req.headers["content-type"] ?? "application/json",
          },
          // `req.body` is the raw request body string forwarded by zfb's
          // plugin host. Forward it verbatim — the bin sidecar expects JSON.
          body: req.body ?? "",
        });
      } catch (err) {
        // Sidecar unreachable (not started yet, crashed, wrong port, …).
        ctx.logger.error(
          `[dev-apply-proxy] fetch to ${BIN_SIDECAR_APPLY_URL} failed: ${String(err)}`,
        );
        return {
          status: 502,
          headers: { "content-type": "text/plain" },
          body: `Bad Gateway: bin sidecar unreachable at ${BIN_SIDECAR_APPLY_URL}`,
        };
      }

      const responseBody = await upstreamResponse.text();
      return {
        status: upstreamResponse.status,
        headers: {
          "content-type":
            upstreamResponse.headers.get("content-type") ?? "application/json",
        },
        body: responseBody,
      };
    });
  },
};
