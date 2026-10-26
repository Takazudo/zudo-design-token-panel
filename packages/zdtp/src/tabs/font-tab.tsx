/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, signal } from '@takazudo/zfb/zudo-react';
import type { PanelConfig } from '../config/panel-config';
import { getPanelConfig } from '../config/panel-config';
import { RoleButton } from '../controls/role-button';
import { changedContribution, type ChangedContributionOptions } from '../changed/contribution';
import { previewGlyphContribution } from '../specimen/preview-glyphs';
import { createSpecimenContribution, orderSpecimenTierItems } from '../specimen/specimen-tab-body';
import { loadSpecimenState, saveSpecimenState } from '../specimen/specimen-state';
import SpecimenToolbar from '../specimen/specimen-toolbar';
import OnPageSpecimen from '../specimen/on-page-specimen';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistFont } from '../state/persist';
import { read, type Reactive } from '../zr/live';
import type { PanelServices } from '../zr/panel-services';
import FlatTab from './flat/flat-tab';
import type { RowContribution, TokenAddress } from './flat/types';
import type { BulkPatchEntry } from '../bulk';

export interface FontTabProps {
  tab: TabConfig;
  state: TokenOverrides;
  persistFont: PersistFont;
  instanceConfig?: PanelConfig;
  /** Whether the read-only specimen is currently portaled into the host page. */
  renderOnPage?: boolean;
  /** Called when the toolbar toggles the page-level specimen. */
  onRenderOnPageChange?: (enabled: boolean) => void;
  searchQuery?: string;
  onBulkApply?: (patch: readonly BulkPatchEntry[]) => void;
  changed?: ChangedContributionOptions | undefined;
  changedOnly?: boolean;
  /** Extra row contributions after the built-in ones (read once at mount). */
  extraContributions?: readonly RowContribution[];
  services: PanelServices;
}

export default function FontTab(props: Reactive<FontTabProps, 'tab' | 'persistFont' | 'instanceConfig' | 'onRenderOnPageChange' | 'onBulkApply' | 'extraContributions' | 'services'>) {
  const { tab, persistFont, onRenderOnPageChange, onBulkApply, services } = props;
  const instanceConfig = props.instanceConfig ?? getPanelConfig();
  const state = computed(() => read(props.state));
  const getValue = computed(() => {
    const current = state.value;
    return (_address: TokenAddress, item: TierItem) => current[item.id] ?? item.default;
  });
  const setValue = (address: TokenAddress, next: string) => {
    persistFont((prev) => ({ ...prev, [address.itemId]: next }));
  };
  const deleteValue = (address: TokenAddress) => {
    persistFont((prev) => { const next = { ...prev }; delete next[address.itemId]; return next; });
  };
  const resetAll = () => persistFont(() => ({}));
  const overrides = computed(() => Object.fromEntries(tab.tiers.map((tier) => [tier.id, state.value])));
  const hasSpecimen = tab.tiers.some((tier) => tier.preview === 'size' || tier.preview === 'line-height');
  const hasLineHeight = tab.tiers.some((tier) => tier.preview === 'line-height');
  const specimen = signal(loadSpecimenState(instanceConfig));
  const localRenderOnPage = signal(false);
  const renderOnPage = computed(() => (onRenderOnPageChange
    ? read(props.renderOnPage) ?? false
    : localRenderOnPage.value));
  const handleRenderOnPageChange = (enabled: boolean) => {
    if (onRenderOnPageChange) onRenderOnPageChange(enabled);
    else localRenderOnPage.value = enabled;
  };
  getScope().effect(() => {
    const current = specimen.value;
    if (hasSpecimen) saveSpecimenState(instanceConfig, current);
  });
  const valueFor = computed(() => {
    const current = state.value;
    return (item: TierItem) => current[item.id] ?? item.default;
  });
  const contributions = [
    previewGlyphContribution(),
    createSpecimenContribution({ tab, state: specimen, valueFor, onPage: renderOnPage }),
    changedContribution(computed(() => read(props.changed))),
    ...(props.extraContributions ?? []),
  ];

  return (
    <>
      {hasSpecimen && (
        <OnPageSpecimen
          enabled={renderOnPage}
          tab={tab}
          state={specimen}
          valueFor={valueFor}
          instanceConfig={instanceConfig}
        />
      )}
      <FlatTab
        tab={tab}
        getValue={getValue}
        setValue={setValue}
        deleteValue={deleteValue}
        overrides={overrides}
        contributions={contributions}
        searchQuery={props.searchQuery}
        changedOnly={props.changedOnly}
        orderItems={(tier) => orderSpecimenTierItems(tab, tier, valueFor.value)}
        onBulkApply={onBulkApply}
        sectionTestId={(tier) => `font-tier-${tier.id}`}
        services={services}
        actions={(
          <>
            {hasSpecimen && (
              <SpecimenToolbar
                state={specimen}
                showWidth={hasLineHeight}
                onChange={(next) => {
                  specimen.value = next;
                }}
                renderOnPage={renderOnPage}
                onRenderOnPageChange={handleRenderOnPageChange}
              />
            )}
            <div class="tokenpanel-tab-actions">
              <RoleButton class="tokenpanel-action-link" onClick={resetAll}>
                Reset Font
              </RoleButton>
            </div>
          </>
        )}
      />
    </>
  );
}
