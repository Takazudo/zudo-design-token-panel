/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed } from '@takazudo/zfb/zudo-react';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import type { PersistSize } from '../state/persist';
import type { TokenOverrides } from '../state/tweak-state';
import { RoleButton } from '../controls/role-button';
import { changedContribution, type ChangedContributionOptions } from '../changed/contribution';
import { previewGlyphContribution } from '../specimen/preview-glyphs';
import { read, type Reactive } from '../zr/live';
import type { PanelServices } from '../zr/panel-services';
import FlatTab from './flat/flat-tab';
import type { TokenAddress } from './flat/types';
import type { BulkPatchEntry } from '../bulk';

export interface SizeTabProps {
  tab: TabConfig;
  state: TokenOverrides;
  persistSize: PersistSize;
  searchQuery?: string;
  onBulkApply?: (patch: readonly BulkPatchEntry[]) => void;
  changed?: ChangedContributionOptions | undefined;
  changedOnly?: boolean;
  services: PanelServices;
}

export default function SizeTab(props: Reactive<SizeTabProps, 'tab' | 'persistSize' | 'onBulkApply' | 'services'>) {
  const { tab, persistSize, onBulkApply, services } = props;
  const state = computed(() => read(props.state));
  const getValue = computed(() => {
    const current = state.value;
    return (_address: TokenAddress, item: TierItem) => current[item.id] ?? item.default;
  });
  const setValue = (address: TokenAddress, next: string) => {
    persistSize((prev) => ({ ...prev, [address.itemId]: next }));
  };
  const deleteValue = (address: TokenAddress) => {
    persistSize((prev) => { const next = { ...prev }; delete next[address.itemId]; return next; });
  };
  const resetAll = () => persistSize(() => ({}));
  const overrides = computed(() => Object.fromEntries(tab.tiers.map((tier) => [tier.id, state.value])));
  const contributions = [previewGlyphContribution(), changedContribution(computed(() => read(props.changed)))];

  return (
    <FlatTab
      tab={tab}
      getValue={getValue}
      setValue={setValue}
      deleteValue={deleteValue}
      overrides={overrides}
      contributions={contributions}
      searchQuery={props.searchQuery}
      changedOnly={props.changedOnly}
      sectionTestId={(tier) => `size-tier-${tier.id}`}
      onBulkApply={onBulkApply}
      services={services}
      actions={(
        <div class="tokenpanel-tab-actions">
          <RoleButton class="tokenpanel-action-link" onClick={resetAll}>
            Reset Size
          </RoleButton>
        </div>
      )}
    />
  );
}
