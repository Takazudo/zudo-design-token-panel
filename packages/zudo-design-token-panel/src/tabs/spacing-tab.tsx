import { useCallback, useMemo } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistSpacing } from '../state/persist';
import TierRefSelector from '../controls/tier-ref-selector';
import { TIER_REF_LITERAL_SIGNAL } from '../controls/tier-ref-selector';
import GenericItemEditor from './_generic-item-editor';

interface SpacingTabProps {
  tab: TabConfig;
  state: TokenOverrides;
  persistSpacing: PersistSpacing;
}

/**
 * Spacing tab — TabConfig.tiers driven.
 *
 * Renders tiers in declaration order. Items within each tier are grouped by
 * `item.group`. Tiers listed in `tab.advancedTiers` are rendered under a
 * `<details>` disclosure. When a tier has `referencesTier`, its items render
 * `TierRefSelector` instead of the kind-specific control.
 *
 * The persist path remains the same: `state.spacing` is a flat `TokenOverrides`
 * map keyed by item id. Reference values are stored as the target item id; the
 * apply pipeline emits `var(--targetCssVar)`.
 */
export default function SpacingTab({ tab, state, persistSpacing }: SpacingTabProps) {
  const handleChange = useCallback(
    (id: string, next: string) => {
      // TIER_REF_LITERAL_SIGNAL means the user wants to flip back to literal
      // mode — drop the stored ref id so the item reverts to its default.
      if (next === TIER_REF_LITERAL_SIGNAL) {
        persistSpacing((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        return;
      }
      persistSpacing((prev) => ({ ...prev, [id]: next }));
    },
    [persistSpacing],
  );

  const handleResetAll = useCallback(() => {
    persistSpacing(() => ({}));
  }, [persistSpacing]);

  const advancedTierIds = useMemo(
    () => new Set<string>(tab.advancedTiers ?? []),
    [tab.advancedTiers],
  );

  const normalTiers = tab.tiers.filter((t) => !advancedTierIds.has(t.id));
  const advancedTiers = tab.tiers.filter((t) => advancedTierIds.has(t.id));

  return (
    <div className="tokenpanel-tab-content">
      {/* Tab-level actions */}
      <div className="tokenpanel-tab-actions">
        <button type="button" onClick={handleResetAll} className="tokenpanel-action-link">
          Reset Spacing
        </button>
      </div>

      {normalTiers.map((tier) => (
        <TierSection
          key={tier.id}
          tab={tab}
          tier={tier}
          state={state}
          onChange={handleChange}
        />
      ))}

      {advancedTiers.length > 0 && (
        <details className="tokenpanel-tab-advanced">
          <summary className="tokenpanel-tab-advanced-summary">
            {advancedTiers.length === 1 ? advancedTiers[0].label : 'Advanced'}
          </summary>
          <div className="tokenpanel-tab-advanced-body">
            {advancedTiers.map((tier) => (
              <TierSection
                key={tier.id}
                tab={tab}
                tier={tier}
                state={state}
                onChange={handleChange}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TierSection
// ---------------------------------------------------------------------------

interface TierSectionProps {
  tab: TabConfig;
  tier: TierConfig;
  state: TokenOverrides;
  onChange: (id: string, next: string) => void;
}

function TierSection({ tab, tier, state, onChange }: TierSectionProps) {
  // Group items by item.group for section headers. Items without a group go
  // into the '' bucket rendered without a heading.
  const { groupOrder, grouped } = useMemo(() => {
    const groups: string[] = [];
    const seenGroups = new Set<string>();
    const grouped: Record<string, TierItem[]> = {};
    for (const item of tier.items) {
      const g = item.group ?? '';
      if (!seenGroups.has(g)) {
        seenGroups.add(g);
        groups.push(g);
      }
      (grouped[g] ??= []).push(item);
    }
    return { groupOrder: groups, grouped };
  }, [tier.items]);

  const isRefTier = tier.referencesTier !== undefined;

  return (
    <section className="tokenpanel-tab-section" data-testid={`spacing-tier-${tier.id}`}>
      <h3 className="tokenpanel-tab-section-heading">{tier.label}</h3>
      {groupOrder.map((group) => {
        const items = grouped[group];
        if (!items || items.length === 0) return null;
        return (
          <div key={group} className="tokenpanel-tier-group">
            {group && <h4 className="tokenpanel-tier-group-heading">{group}</h4>}
            <div className="tokenpanel-tab-grid">
              {items.map((item) => {
                const value = state[item.id] ?? item.default;
                if (isRefTier) {
                  return (
                    <div
                      key={item.id}
                      className="tokenpanel-row"
                      data-testid={`tier-ref-row-${item.id}`}
                    >
                      <span className="tokenpanel-row-label" title={item.cssVar}>
                        {item.cssVar}
                        {item.label !== item.cssVar && (
                          <span className="tokenpanel-row-label-sub">{item.label}</span>
                        )}
                      </span>
                      <TierRefSelector
                        tab={tab}
                        tierId={tier.id}
                        itemId={item.id}
                        value={value}
                        onChange={onChange}
                      />
                    </div>
                  );
                }
                return (
                  <GenericItemEditor
                    key={item.id}
                    item={item}
                    value={value}
                    onChange={onChange}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
