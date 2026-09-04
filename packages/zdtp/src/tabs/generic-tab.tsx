import { useCallback } from 'preact/compat';
import type { TabOverrides } from '../apply/tier-resolver';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import FlatTab from './flat/flat-tab';
import type { TokenAddress } from './flat/types';
import type { RowContribution } from './flat/types';
import { previewGlyphContribution } from '../specimen/preview-glyphs';

const PREVIEW_GLYPH = previewGlyphContribution();

export interface GenericTabProps {
  tab: TabConfig;
  overrides: TabOverrides;
  onChange: (tierId: string, itemId: string, next: string | undefined) => void;
  searchQuery?: string;
  changedContribution?: RowContribution;
  changedOnly?: boolean;
}

export default function GenericTab({
  tab,
  overrides,
  onChange,
  searchQuery = '',
  changedContribution,
  changedOnly = false,
}: GenericTabProps) {
  const getValue = useCallback((address: TokenAddress, item: TierItem) => overrides[address.tierId]?.[address.itemId] ?? item.default, [overrides]);
  const setValue = useCallback((address: TokenAddress, next: string) => onChange(address.tierId, address.itemId, next), [onChange]);
  const deleteValue = useCallback((address: TokenAddress) => onChange(address.tierId, address.itemId, undefined), [onChange]);

  const contributions = changedContribution ? [PREVIEW_GLYPH, changedContribution] : [PREVIEW_GLYPH];
  return <FlatTab tab={tab} getValue={getValue} setValue={setValue} deleteValue={deleteValue}
    overrides={overrides} contributions={contributions} searchQuery={searchQuery}
    changedOnly={changedOnly}
    testId={`generic-tab-${tab.id}`} sectionTestId={(tier) => `tier-section-${tier.id}`} />;
}
