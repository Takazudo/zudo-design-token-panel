/**
 * @takazudo/zdtp/server
 *
 * Node-only server-side apply pipeline. Zero framework dependencies —
 * the handler factory uses standard Fetch API types (Node 18+).
 *
 * @example
 * ```ts
 * import { createApplyHandler } from '@takazudo/zdtp/server';
 * import { resolve } from 'node:path';
 *
 * const handler = createApplyHandler({
 *   rootDir: process.cwd(),
 *   writeRoot: resolve(process.cwd(), 'tokens'),
 *   routing: { zd: 'tokens/tokens.css' },
 * });
 * ```
 */

export { createApplyHandler } from './create-apply-handler';
export type { ApplyHandlerOptions, PerFileResult } from './create-apply-handler';
export { serializeFileWrite } from './serialize-write';
export {
  CSS_VAR_NAME_RE,
  isPathSafe,
  isValidCssVarName,
  validateAndSanitizeTokens,
} from './path-safety';
export { loadRoutingFromFile, type ApplyRoutingMap } from './load-routing';
