import { bridgeToPreact } from '../zr/preact-bridge';
import { withServices } from '../zr/with-services-preact';
import FontTabZr, { type FontTabProps } from './font-tab';
import GenericTabZr, { type GenericTabProps } from './generic-tab';
import SizeTabZr, { type SizeTabProps } from './size-tab';
import SpacingTabZr, { type SpacingTabProps } from './spacing-tab';

// Preact adapters for the zudo-react flat tabs, used by the Preact panel
// shell until it moves to zudo-react (epic #1075).

export const SpacingTab = withServices(bridgeToPreact<SpacingTabProps, 'persistSpacing' | 'onBulkApply' | 'tab' | 'services'>(
  SpacingTabZr,
  {
    signals: ['state', 'searchQuery', 'changed', 'changedOnly'],
    callbacks: ['persistSpacing', 'onBulkApply'],
    statics: ['tab', 'services'],
  },
), ['tab']);

export const SizeTab = withServices(bridgeToPreact<SizeTabProps, 'persistSize' | 'onBulkApply' | 'tab' | 'services'>(
  SizeTabZr,
  {
    signals: ['state', 'searchQuery', 'changed', 'changedOnly'],
    callbacks: ['persistSize', 'onBulkApply'],
    statics: ['tab', 'services'],
  },
), ['tab']);

export const FontTab = withServices(bridgeToPreact<
  FontTabProps,
  'persistFont' | 'onBulkApply' | 'onRenderOnPageChange' | 'tab' | 'instanceConfig' | 'extraContributions' | 'services'
>(FontTabZr, {
  signals: ['state', 'renderOnPage', 'searchQuery', 'changed', 'changedOnly'],
  callbacks: ['persistFont', 'onBulkApply', 'onRenderOnPageChange'],
  statics: ['tab', 'instanceConfig', 'extraContributions', 'services'],
}), ['tab', 'instanceConfig']);

export const GenericTab = withServices(bridgeToPreact<GenericTabProps, 'onChange' | 'onBulkApply' | 'tab' | 'services'>(
  GenericTabZr,
  {
    signals: ['overrides', 'searchQuery', 'changed', 'changedOnly'],
    callbacks: ['onChange', 'onBulkApply'],
    statics: ['tab', 'services'],
  },
), ['tab']);
