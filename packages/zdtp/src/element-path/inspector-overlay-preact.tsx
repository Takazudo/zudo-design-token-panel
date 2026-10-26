import { bridgeToPreact } from '../zr/preact-bridge';
import { InspectorOverlay as InspectorOverlayZr, type InspectorOverlayProps } from './inspector-overlay';

// Preact adapter for the zudo-react Element Path inspector, used by the Preact
// orchestrator until it moves to zudo-react (epic #1075).
export const InspectorOverlay = bridgeToPreact<InspectorOverlayProps, 'onArmingRevoked'>(InspectorOverlayZr, {
  signals: ['enabled'],
  callbacks: ['onArmingRevoked'],
});
