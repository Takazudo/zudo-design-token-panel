import { useCallback } from 'preact/compat';
import type { TabConfig, TierConfig } from '../tokens/tier-model';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistFont } from '../state/persist';
import TierRefSelector from '../controls/tier-ref-selector';
import { TIER_REF_LITERAL_SIGNAL } from '../controls/tier-ref-selector';
import GenericItemEditor from './_generic-item-editor';
import { HighlightToggleButton } from '../highlight/highlight-toggle-button';
import { resolveTierItemValue } from '../apply/tier-resolver';
import TokenLabel from '../controls/token-label';

interface FontTabProps {
  tab: TabConfig;
  state: TokenOverrides;
  persistFont: PersistFont;
}

/**
 * Font tab — TabConfig.tiers driven.
 *
 * Renders all tiers flat in declaration order. Each tier has one heading
 * (div role=heading aria-level=3). No progressive disclosure (details/summary).
 * When a tier has `referencesTier`, its items render `TierRefSelector`.
 *
 * The persist path: `state.typography` is a flat `TokenOverrides` map keyed
 * by item id. Reference values store the target item id; apply emits
 * `var(--targetCssVar)`.
 */
export default function FontTab({ tab, state, persistFont }: FontTabProps) {
  const handleChange = useCallback(
    (id: string, next: string) => {
      if (next === TIER_REF_LITERAL_SIGNAL) {
        persistFont((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
        return;
      }
      persistFont((prev) => ({ ...prev, [id]: next }));
    },
    [persistFont],
  );

  const handleResetAll = useCallback(() => {
    persistFont(() => ({}));
  }, [persistFont]);

  return (
    <div className="tokenpanel-tab-content">
      {/* Tab-level actions */}
      <div className="tokenpanel-tab-actions">
        <div
          role="button"
          tabIndex={0}
          className="tokenpanel-action-link"
          onClick={handleResetAll}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleResetAll();
            }
          }}
        >
          Reset Font
        </div>
      </div>

      {tab.tiers.map((tier) => (
        <TierSection
          key={tier.id}
          tab={tab}
          tier={tier}
          state={state}
          onChange={handleChange}
        />
      ))}
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
  const isRefTier = tier.referencesTier !== undefined;

  return (
    <div className="tokenpanel-tab-section" data-testid={`font-tier-${tier.id}`}>
      <div
        role="heading"
        aria-level={3}
        className="tokenpanel-tab-section-heading"
      >
        {tier.label}
      </div>
      <div className="tokenpanel-tab-grid">
        {tier.items.map((item) => {
          const value = state[item.id] ?? item.default;
          if (isRefTier) {
            return (
              <div
                key={item.id}
                className="tokenpanel-row"
                data-testid={`tier-ref-row-${item.id}`}
              >
                <TokenLabel cssVar={item.cssVar} label={item.label} />
                <TierRefSelector
                  tab={tab}
                  tierId={tier.id}
                  itemId={item.id}
                  value={value}
                  onChange={onChange}
                  previewValueFor={(refItemId) => {
                    const refTierId = tier.referencesTier!;
                    const result = resolveTierItemValue(tab, refTierId, refItemId, {
                      [refTierId]: state,
                    });
                    return result.kind === 'literal' ? result.value : result.targetCssVar;
                  }}
                />
                <HighlightToggleButton cssVar={item.cssVar} />
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
}
