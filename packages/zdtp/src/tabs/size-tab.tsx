import { useCallback } from 'preact/compat';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistSize } from '../state/persist';
import FlatTab from './flat/flat-tab';
import type { TokenAddress } from './flat/types';
import type { BulkPatchEntry } from '../bulk';
import { previewGlyphContribution } from '../specimen/preview-glyphs';

const PREVIEW_GLYPH = previewGlyphContribution();

interface SizeTabProps {
  tab: TabConfig;
  state: TokenOverrides;
  persistSize: PersistSize;
  searchQuery?: string;
  onBulkApply?: (patch: readonly BulkPatchEntry[]) => void;
}

export default function SizeTab({ tab, state, persistSize, searchQuery = '', onBulkApply }: SizeTabProps) {
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
    overrides={overrides} contributions={[PREVIEW_GLYPH]} searchQuery={searchQuery} sectionTestId={(tier) => `size-tier-${tier.id}`} onBulkApply={onBulkApply} actions={(
      <div className="tokenpanel-tab-actions"><div role="button" tabIndex={0} className="tokenpanel-action-link"
        onClick={resetAll} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); resetAll(); } }}>
        Reset Size
      </div></div>
    )} />;
}
