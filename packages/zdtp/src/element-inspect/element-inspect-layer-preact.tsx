import { bridgeToPreact } from '../zr/preact-bridge';
import {
  ElementInspectLayer as ElementInspectLayerZr,
  type ElementInspectLayerProps,
  type ElementInspectLayerStaticKeys,
} from './element-inspect-overlay';

// Preact adapter for the zudo-react inspect picker + pinned marker, used by
// the Preact orchestrator until it moves to zudo-react (epic #1075).
export const ElementInspectLayer = bridgeToPreact<ElementInspectLayerProps, ElementInspectLayerStaticKeys>(
  ElementInspectLayerZr,
  {
    signals: ['armed', 'pinned'],
    callbacks: ['onElementPicked', 'onPinnedDetached', 'onArmingRevoked'],
    statics: ['pickerHandle'],
  },
);
