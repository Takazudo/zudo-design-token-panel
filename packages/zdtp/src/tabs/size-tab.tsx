import { useCallback } from 'preact/compat';
import type { TabConfig, TierConfig } from '../tokens/tier-model';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistSize } from '../state/persist';
import TierRefSelector, { type TierRefSelectorValue } from '../controls/tier-ref-selector';
import GenericItemEditor from './_generic-item-editor';
import { HighlightToggleButton } from '../highlight/highlight-toggle-button';
import { resolveTierItemValue } from '../apply/tier-resolver';
import TokenLabel from '../controls/token-label';

interface SizeTabProps {
  tab: TabConfig;
  state: TokenOverrides;
  persistSize: PersistSize;
}

/**
 * Size tab — TabConfig.tiers driven.
 *
 * Renders all tiers flat in declaration order. Each tier has one heading
 * (div role=heading aria-level=3). No progressive disclosure (details/summary).
 * When a tier has `referencesTier`, items render TierRefSelector.
 * Pill toggle is preserved: `item.pill` drives a checkbox + disabled slider
 * exactly as the legacy PillSliderRow did.
 */
export default function SizeTab({ tab, state, persistSize }: SizeTabProps) {
  const handleChange = useCallback(
    (id: string, next: string) => {
      persistSize((prev) => ({ ...prev, [id]: next }));
    },
    [persistSize],
  );

  // Ref-tier items go through this handler instead: `{ ref }` stores the
  // target item id (back-compat with the pre-#470 bare-string persisted
  // shape); `{ literal }` means "flip the item back to literal mode" — drop
  // the stored override so it reverts to the tier's own default ref.
  const handleRefChange = useCallback(
    (id: string, next: TierRefSelectorValue) => {
      if ('literal' in next) {
        persistSize((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
        return;
      }
      persistSize((prev) => ({ ...prev, [id]: next.ref.item }));
    },
    [persistSize],
  );

  const handleResetAll = useCallback(() => {
    persistSize(() => ({}));
  }, [persistSize]);

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
          Reset Size
        </div>
      </div>

      {tab.tiers.map((tier) => (
        <TierSection
          key={tier.id}
          tab={tab}
          tier={tier}
          state={state}
          onChange={handleChange}
          onRefChange={handleRefChange}
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
  onRefChange: (id: string, next: TierRefSelectorValue) => void;
}

function TierSection({ tab, tier, state, onChange, onRefChange }: TierSectionProps) {
  const isRefTier = tier.referencesTier !== undefined;

  return (
    <div className="tokenpanel-tab-section" data-testid={`size-tier-${tier.id}`}>
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
            const refTierId = tier.referencesTier!;
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
                  value={{ ref: { tier: refTierId, item: value } }}
                  onChange={onRefChange}
                  previewValueFor={(ref) => {
                    const result = resolveTierItemValue(tab, refTierId, ref.item, {
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
