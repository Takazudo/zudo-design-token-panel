import { useCallback } from 'preact/compat';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistFont } from '../state/persist';
import FlatTab from './flat/flat-tab';
import type { TokenAddress } from './flat/types';

interface FontTabProps { tab: TabConfig; state: TokenOverrides; persistFont: PersistFont }

export default function FontTab({ tab, state, persistFont }: FontTabProps) {
  const getValue = useCallback((_address: TokenAddress, item: TierItem) => state[item.id] ?? item.default, [state]);
  const setValue = useCallback((address: TokenAddress, next: string) => {
    persistFont((prev) => ({ ...prev, [address.itemId]: next }));
  }, [persistFont]);
  const deleteValue = useCallback((address: TokenAddress) => {
    persistFont((prev) => { const next = { ...prev }; delete next[address.itemId]; return next; });
  }, [persistFont]);
  const resetAll = useCallback(() => persistFont(() => ({})), [persistFont]);
  const overrides = Object.fromEntries(tab.tiers.map((tier) => [tier.id, state]));

  return <FlatTab tab={tab} getValue={getValue} setValue={setValue} deleteValue={deleteValue}
    overrides={overrides} sectionTestId={(tier) => `font-tier-${tier.id}`} actions={(
      <div className="tokenpanel-tab-actions"><div role="button" tabIndex={0} className="tokenpanel-action-link"
        onClick={resetAll} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); resetAll(); } }}>
        Reset Font
      </div></div>
    )} />;
}
