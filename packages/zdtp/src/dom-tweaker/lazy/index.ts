/**
 * DOM Tweaker lazy boundary barrel.
 *
 * The eager orchestrator dynamically imports this module on first enable. The
 * real editor/runtime wiring lands in the follow-up DOM Tweaker tasks; this
 * stub intentionally renders nothing while pinning the explicit config payload
 * that the lazy side is allowed to receive.
 */

import type { JSX } from 'preact';

export {
  buildStaticSuggestions,
  buildSuggestions,
  buildThemeSuggestions,
  filterSuggestions,
  STATIC_SUGGESTIONS,
} from './suggestions';

export interface DomTweakerLazyBoundaryProps {
  storagePrefix: string;
  themeCss?: string;
  consoleNamespace: string;
}

export function DomTweakerLazyBoundary(
  _props: DomTweakerLazyBoundaryProps,
): JSX.Element | null {
  return null;
}
