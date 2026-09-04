import { useCallback } from 'preact/compat';
import type { TabOverrides } from '../apply/tier-resolver';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import FlatTab from './flat/flat-tab';
import type { TokenAddress } from './flat/types';
import { previewGlyphContribution } from '../specimen/preview-glyphs';

const PREVIEW_GLYPH = previewGlyphContribution();

export interface GenericTabProps {
  tab: TabConfig;
  overrides: TabOverrides;
  onChange: (tierId: string, itemId: string, next: string | undefined) => void;
  searchQuery?: string;
}

export default function GenericTab({ tab, overrides, onChange, searchQuery = '' }: GenericTabProps) {
  const getValue = useCallback((address: TokenAddress, item: TierItem) => overrides[address.tierId]?.[address.itemId] ?? item.default, [overrides]);
  const setValue = useCallback((address: TokenAddress, next: string) => onChange(address.tierId, address.itemId, next), [onChange]);
  const deleteValue = useCallback((address: TokenAddress) => onChange(address.tierId, address.itemId, undefined), [onChange]);

  return <FlatTab tab={tab} getValue={getValue} setValue={setValue} deleteValue={deleteValue}
    overrides={overrides} contributions={[PREVIEW_GLYPH]} searchQuery={searchQuery}
    testId={`generic-tab-${tab.id}`} sectionTestId={(tier) => `tier-section-${tier.id}`} />;
}
