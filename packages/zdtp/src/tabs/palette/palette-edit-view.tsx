/**
 * PaletteEditView — stub, filled in by #395.
 *
 * Receives the palette tiers and current overrides. Each group = a TierConfig
 * (its label = group heading); each step = a TierItem with type: { kind: 'color', format: 'oklch' }.
 */

import type { TabConfig } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';

export interface PaletteEditViewProps {
  tab: TabConfig;
  overrides: TabOverrides;
  onChange: (tierId: string, itemId: string, next: string) => void;
}

export default function PaletteEditView({ tab }: PaletteEditViewProps) {
  return (
    <div className="tokenpanel-palette-edit-view" data-testid="palette-edit-view">
      {tab.tiers.map((tier) => (
        <div key={tier.id} className="tokenpanel-tab-section" data-testid={`palette-edit-tier-${tier.id}`}>
          <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading">
            {tier.label}
          </div>
        </div>
      ))}
    </div>
  );
}
