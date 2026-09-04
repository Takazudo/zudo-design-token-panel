const BIN_SIDECAR_APPLY_URL = 'http://127.0.0.1:24685/apply';
const APPLY_ROUTE = '/api/dev/apply';
const SIDECAR_TIMEOUT_MS = 15_000;

/** @type {import('@takazudo/zfb/plugins').ZfbPlugin} */
export default {
  name: 'dev-apply-proxy',

  devMiddleware(ctx) {
    ctx.register(APPLY_ROUTE, async (req) => {
      if (req.method !== 'POST') {
        return {
          status: 405,
          headers: { 'content-type': 'text/plain' },
          body: 'Method Not Allowed',
        };
      }

      let upstream;
      try {
        upstream = await fetch(BIN_SIDECAR_APPLY_URL, {
          method: 'POST',
          headers: {
            'content-type': req.headers['content-type'] ?? 'application/json',
          },
          body: req.body ?? '',
          signal: AbortSignal.timeout(SIDECAR_TIMEOUT_MS),
        });
      } catch (error) {
        const timedOut = error instanceof Error && error.name === 'TimeoutError';
        ctx.logger.error('[dev-apply-proxy] sidecar request failed: ' + String(error));
        return {
          status: timedOut ? 504 : 502,
          headers: { 'content-type': 'text/plain' },
          body: timedOut ? 'Gateway Timeout' : 'Bad Gateway',
        };
      }

      return {
        status: upstream.status,
        headers: {
          'content-type': upstream.headers.get('content-type') ?? 'application/json',
        },
        body: await upstream.text(),
      };
    });
  },
};
