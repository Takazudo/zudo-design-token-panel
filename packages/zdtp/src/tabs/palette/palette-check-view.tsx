/**
 * PaletteCheckView — stub, filled in by #394.
 *
 * Receives the palette tiers and current overrides. Each group = a TierConfig
 * (its label = group heading); each step = a TierItem with type: { kind: 'color', format: 'oklch' }.
 */

import type { TabConfig } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';

export interface PaletteCheckViewProps {
  tab: TabConfig;
  overrides: TabOverrides;
  onChange: (tierId: string, itemId: string, next: string) => void;
}

export default function PaletteCheckView({ tab }: PaletteCheckViewProps) {
  return (
    <div className="tokenpanel-palette-check-view" data-testid="palette-check-view">
      {tab.tiers.map((tier) => (
        <div key={tier.id} className="tokenpanel-tab-section" data-testid={`palette-check-tier-${tier.id}`}>
          <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading">
            {tier.label}
          </div>
        </div>
      ))}
    </div>
  );
}
