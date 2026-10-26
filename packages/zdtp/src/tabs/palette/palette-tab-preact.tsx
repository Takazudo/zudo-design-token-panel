import { bridgeToPreact } from '../../zr/preact-bridge';
import { withServices } from '../../zr/with-services-preact';
import PaletteTabZr, { type PaletteTabProps, type PaletteTabStaticKeys } from './palette-tab';

// Preact adapter for the zudo-react Palette tab, used by the Preact panel shell
// until it moves to zudo-react (epic #1075).
const PaletteTab = withServices(bridgeToPreact<
  PaletteTabProps & { services: NonNullable<PaletteTabProps['services']> },
  PaletteTabStaticKeys
>(PaletteTabZr, {
  signals: ['tab', 'overrides', 'searchQuery', 'changedOnly', 'isChanged', 'jumpAddress'],
  callbacks: ['onChange', 'onCommitBatch', 'onJumpAddressHandled'],
  statics: ['services'],
}), []);

export default PaletteTab;
