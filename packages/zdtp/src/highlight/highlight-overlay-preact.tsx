import { bridgeToPreact } from '../zr/preact-bridge';
import { HighlightOverlay as HighlightOverlayZr, type HighlightOverlayProps } from './highlight-overlay';

// Preact adapter for the zudo-react highlight rings, used by the Preact
// orchestrator until it moves to zudo-react (epic #1075).
export const HighlightOverlay = bridgeToPreact<HighlightOverlayProps>(HighlightOverlayZr, {
  signals: ['items'],
});
