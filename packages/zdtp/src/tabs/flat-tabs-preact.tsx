import type { FunctionComponent } from 'preact';
import { bridgeToPreact } from '../zr/preact-bridge';
import type { PanelServices } from '../zr/panel-services';
import { usePanelServices } from '../zr/panel-services-preact';
import FontTabZr, { type FontTabProps } from './font-tab';
import GenericTabZr, { type GenericTabProps } from './generic-tab';
import SizeTabZr, { type SizeTabProps } from './size-tab';
import SpacingTabZr, { type SpacingTabProps } from './spacing-tab';

// Preact adapters for the zudo-react flat tabs, used by the Preact panel
// shell until it moves to zudo-react (epic #1075). Each reads the panel's
// Preact contexts into the `services` object the zudo-react subtree needs.

type WithoutServices<P> = Omit<P, 'services'>;

const identities = new WeakMap<object, number>();
let nextIdentity = 0;

function identityOf(value: unknown): string {
  if (typeof value !== 'object' || value === null) return String(value);
  let id = identities.get(value);
  if (id === undefined) {
    id = nextIdentity++;
    identities.set(value, id);
  }
  return String(id);
}

function withServices<P extends { services: PanelServices }>(
  Bridged: FunctionComponent<P>,
): FunctionComponent<WithoutServices<P>> {
  function WithPanelServices(props: WithoutServices<P>) {
    const services = usePanelServices();
    // Statics are read once at mount, so a new tab config remounts the tab.
    const record = props as Record<string, unknown>;
    const key = `${identityOf(record.tab)}:${identityOf(record.instanceConfig)}`;
    return <Bridged key={key} {...(props as P)} services={services} />;
  }
  return WithPanelServices;
}

export const SpacingTab = withServices(bridgeToPreact<SpacingTabProps, 'persistSpacing' | 'onBulkApply' | 'tab' | 'services'>(
  SpacingTabZr,
  {
    signals: ['state', 'searchQuery', 'changed', 'changedOnly'],
    callbacks: ['persistSpacing', 'onBulkApply'],
    statics: ['tab', 'services'],
  },
));

export const SizeTab = withServices(bridgeToPreact<SizeTabProps, 'persistSize' | 'onBulkApply' | 'tab' | 'services'>(
  SizeTabZr,
  {
    signals: ['state', 'searchQuery', 'changed', 'changedOnly'],
    callbacks: ['persistSize', 'onBulkApply'],
    statics: ['tab', 'services'],
  },
));

export const FontTab = withServices(bridgeToPreact<
  FontTabProps,
  'persistFont' | 'onBulkApply' | 'onRenderOnPageChange' | 'tab' | 'instanceConfig' | 'extraContributions' | 'services'
>(FontTabZr, {
  signals: ['state', 'renderOnPage', 'searchQuery', 'changed', 'changedOnly'],
  callbacks: ['persistFont', 'onBulkApply', 'onRenderOnPageChange'],
  statics: ['tab', 'instanceConfig', 'extraContributions', 'services'],
}));

export const GenericTab = withServices(bridgeToPreact<GenericTabProps, 'onChange' | 'onBulkApply' | 'tab' | 'services'>(
  GenericTabZr,
  {
    signals: ['overrides', 'searchQuery', 'changed', 'changedOnly'],
    callbacks: ['onChange', 'onBulkApply'],
    statics: ['tab', 'services'],
  },
));
