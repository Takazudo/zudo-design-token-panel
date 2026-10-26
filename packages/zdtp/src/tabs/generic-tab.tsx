/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed } from '@takazudo/zfb/zudo-react';
import type { TabOverrides } from '../apply/tier-resolver';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import { changedContribution, type ChangedContributionOptions } from '../changed/contribution';
import { previewGlyphContribution } from '../specimen/preview-glyphs';
import { read, type Reactive } from '../zr/live';
import type { PanelServices } from '../zr/panel-services';
import FlatTab from './flat/flat-tab';
import type { TokenAddress } from './flat/types';
import type { BulkPatchEntry } from '../bulk';

export interface GenericTabProps {
  tab: TabConfig;
  overrides: TabOverrides;
  onChange: (tierId: string, itemId: string, next: string | undefined) => void;
  searchQuery?: string;
  onBulkApply?: (patch: readonly BulkPatchEntry[]) => void;
  changed?: ChangedContributionOptions | undefined;
  changedOnly?: boolean;
  services: PanelServices;
}

export default function GenericTab(props: Reactive<GenericTabProps, 'tab' | 'onChange' | 'onBulkApply' | 'services'>) {
  const { tab, onChange, onBulkApply, services } = props;
  const overrides = computed(() => read(props.overrides));
  const getValue = computed(() => {
    const current = overrides.value;
    return (address: TokenAddress, item: TierItem) => current[address.tierId]?.[address.itemId] ?? item.default;
  });
  const setValue = (address: TokenAddress, next: string) => onChange(address.tierId, address.itemId, next);
  const deleteValue = (address: TokenAddress) => onChange(address.tierId, address.itemId, undefined);
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
      onBulkApply={onBulkApply}
      testId={`generic-tab-${tab.id}`}
      sectionTestId={(tier) => `tier-section-${tier.id}`}
      services={services}
    />
  );
}
