import { useCallback } from 'preact/compat';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistSpacing } from '../state/persist';
import FlatTab from './flat/flat-tab';
import type { RowContribution, TokenAddress } from './flat/types';
import type { BulkPatchEntry } from '../bulk';
import { previewGlyphContribution } from '../specimen/preview-glyphs';

const PREVIEW_GLYPH = previewGlyphContribution();

interface SpacingTabProps {
  tab: TabConfig;
  state: TokenOverrides;
  persistSpacing: PersistSpacing;
  searchQuery?: string;
  onBulkApply?: (patch: readonly BulkPatchEntry[]) => void;
  changedContribution?: RowContribution;
  changedOnly?: boolean;
}

export default function SpacingTab({
  tab,
  state,
  persistSpacing,
  searchQuery = '',
  onBulkApply,
  changedContribution,
  changedOnly = false,
}: SpacingTabProps) {
  const getValue = useCallback((_address: TokenAddress, item: TierItem) => state[item.id] ?? item.default, [state]);
  const setValue = useCallback((address: TokenAddress, next: string) => {
    persistSpacing((prev) => ({ ...prev, [address.itemId]: next }));
  }, [persistSpacing]);
  const deleteValue = useCallback((address: TokenAddress) => {
    persistSpacing((prev) => { const next = { ...prev }; delete next[address.itemId]; return next; });
  }, [persistSpacing]);
  const resetAll = useCallback(() => persistSpacing(() => ({})), [persistSpacing]);
  const overrides = Object.fromEntries(tab.tiers.map((tier) => [tier.id, state]));

  const contributions = changedContribution ? [PREVIEW_GLYPH, changedContribution] : [PREVIEW_GLYPH];
  return <FlatTab tab={tab} getValue={getValue} setValue={setValue} deleteValue={deleteValue}
    overrides={overrides} contributions={contributions} searchQuery={searchQuery} changedOnly={changedOnly} sectionTestId={(tier) => `spacing-tier-${tier.id}`} onBulkApply={onBulkApply} actions={(
      <div className="tokenpanel-tab-actions"><div role="button" tabIndex={0} className="tokenpanel-action-link"
        onClick={resetAll} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); resetAll(); } }}>
        Reset Spacing
      </div></div>
    )} />;
}
