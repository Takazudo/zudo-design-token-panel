/**
 * Element Path Copy — public surface of the feature module.
 *
 * Lets a developer inspect any host element (hold Alt + hover for a
 * DevTools-style highlight, click to copy an annotated path block to the
 * clipboard) for precise human↔AI communication about the page.
 */

export { ElementPathOrchestrator } from './element-path-orchestrator';
export { ElementPathToggleButton } from './element-path-toggle-button';
export { ElementPathContext } from './element-path-context';
export type { ElementPathContextValue } from './element-path-context';
export {
  buildElementPath,
  buildElementPathString,
  formatElementPath,
  buildUniqueSelector,
  buildBreadcrumb,
} from './build-element-path';
export type { ElementPathResult } from './build-element-path';
export { loadElementPathEnabled, saveElementPathEnabled } from './element-path-state';
