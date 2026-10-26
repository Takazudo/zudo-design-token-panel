/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, For, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { TabOverrides } from '../../apply/tier-resolver';
import type { TierConfig, TierItem } from '../../tokens/tier-model';
import type { PanelServices } from '../../zr/panel-services';
import TokenRow from './token-row';
import type { FlatTabEntry, RowContribution, TokenAddress } from './types';

/** Reorders a tier's items for display; read reactively. */
export type TierItemOrder = (tier: TierConfig) => readonly TierItem[];

export interface TierSectionProps {
  tier: TierConfig;
  entries: ReadonlySignal<readonly FlatTabEntry[]>;
  overrides: ReadonlySignal<TabOverrides>;
  contributions?: readonly RowContribution[];
  testId?: string;
  setValue: (address: TokenAddress, next: string) => void;
  deleteValue: (address: TokenAddress) => void;
  orderItems?: TierItemOrder;
  services: PanelServices;
}

export function TierSection(props: TierSectionProps) {
  const { tier, entries, overrides, testId, setValue, deleteValue, orderItems, services } = props;
  const contributions = props.contributions ?? [];
  const isFullWidthSpecimen = tier.preview === 'size' || tier.preview === 'line-height';
  const rows = computed(() => {
    const entryByItem = new Map(entries.value.map((entry) => [entry.item.id, entry]));
    const items = orderItems ? orderItems(tier) : tier.items;
    return items.flatMap((item) => {
      const entry = entryByItem.get(item.id);
      return entry ? [entry] : [];
    });
  });

  return (
    <div class="tokenpanel-tab-section" data-testid={testId ?? null}>
      <div role="heading" aria-level={3} class="tokenpanel-tab-section-heading">
        {tier.label}
        {contributions.map((contribution) => contribution.tierHeadingExtra
          ? <span class="tokenpanel-tab-section-heading-extra">{contribution.tierHeadingExtra(tier)}</span>
          : null)}
      </div>
      <div class={isFullWidthSpecimen
        ? 'tokenpanel-tab-grid tokenpanel-tab-grid--specimen'
        : 'tokenpanel-tab-grid'}>
        <For each={rows} by={(entry) => entry.item.id}>
          {(entry) => (
            <TokenRow
              entry={entry}
              overrides={overrides}
              contributions={contributions}
              onChange={setValue}
              onDelete={deleteValue}
              services={services}
            />
          )}
        </For>
      </div>
    </div>
  );
}

export default TierSection;
