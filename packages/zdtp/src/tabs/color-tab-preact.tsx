import { bridgeToPreact } from '../zr/preact-bridge';
import { withServices } from '../zr/with-services-preact';
import ColorTabZr, { type ColorTabProps } from './color-tab';

// Preact adapter for the zudo-react Color tab, used by the Preact panel shell
// until it moves to zudo-react (epic #1075).
const ColorTab = withServices(bridgeToPreact<
  ColorTabProps,
  'persistColor' | 'persistSecondary' | 'onRevert' | 'tab' | 'secondaryTab' | 'instanceConfig' | 'services'
>(ColorTabZr, {
  signals: ['state', 'secondaryState', 'tabOverrides', 'searchQuery', 'isChanged', 'changedOnly'],
  callbacks: ['persistColor', 'persistSecondary', 'onRevert'],
  statics: ['tab', 'secondaryTab', 'instanceConfig', 'services'],
}), ['tab', 'secondaryTab', 'instanceConfig']);

export default ColorTab;
