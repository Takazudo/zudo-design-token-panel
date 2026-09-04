import { useCallback } from 'preact/compat';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistSize } from '../state/persist';
import FlatTab from './flat/flat-tab';
import type { TokenAddress } from './flat/types';

interface SizeTabProps { tab: TabConfig; state: TokenOverrides; persistSize: PersistSize }

export default function SizeTab({ tab, state, persistSize }: SizeTabProps) {
  const getValue = useCallback((_address: TokenAddress, item: TierItem) => state[item.id] ?? item.default, [state]);
  const setValue = useCallback((address: TokenAddress, next: string) => {
    persistSize((prev) => ({ ...prev, [address.itemId]: next }));
  }, [persistSize]);
  const deleteValue = useCallback((address: TokenAddress) => {
    persistSize((prev) => { const next = { ...prev }; delete next[address.itemId]; return next; });
  }, [persistSize]);
  const resetAll = useCallback(() => persistSize(() => ({})), [persistSize]);
  const overrides = Object.fromEntries(tab.tiers.map((tier) => [tier.id, state]));

  return <FlatTab tab={tab} getValue={getValue} setValue={setValue} deleteValue={deleteValue}
    overrides={overrides} sectionTestId={(tier) => `size-tier-${tier.id}`} actions={(
      <div className="tokenpanel-tab-actions"><div role="button" tabIndex={0} className="tokenpanel-action-link"
        onClick={resetAll} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); resetAll(); } }}>
        Reset Size
      </div></div>
    )} />;
}
