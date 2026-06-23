/**
 * GenericTab — renders any TabConfig whose id is not one of the reserved ids
 * (color / font / spacing / size). Reserved ids continue to dispatch to their
 * dedicated tab components until Wave 5 migrates them.
 *
 * Renders the tab's tiers in declaration order. Each tier shows a heading and
 * its items via kind-appropriate controls:
 *
 *   length / number → number input with unit suffix (numeric range)
 *   select          → native <select>
 *   text            → free-form text input
 *   color           → native <input type="color"> by default; with format:'oklch' → OKLCH picker emitting oklch()
 *
 * For items in a tier with `referencesTier`, TierRefSelector is rendered
 * instead, so the user can either pick a tier-1 item id (emitted as
 * `var(--target-cssvar)` at apply time) or flip the item back to literal mode.
 */

import { useCallback, useState, useEffect } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem, TierValueKind } from '../tokens/tier-model';
import { type TabOverrides, resolveTierItemValue } from '../apply/tier-resolver';
import TierRefSelector from '../controls/tier-ref-selector';
import { HighlightToggleButton } from '../highlight/highlight-toggle-button';
import TokenLabel from '../controls/token-label';

// ---------------------------------------------------------------------------
// Item editor dispatch
// ---------------------------------------------------------------------------

interface ItemEditorProps {
  tab: TabConfig;
  tier: TierConfig;
  item: TierItem;
  value: string;
  overrides: TabOverrides;
  /** Called with (itemId, newValue) when the user commits a change. */
  onChange: (itemId: string, next: string) => void;
}

/**
 * Dispatch to TierRefSelector for reference tiers, otherwise render the
 * kind-appropriate editor (slider, select, text, color).
 */
function ItemEditor({ tab, tier, item, value, overrides, onChange }: ItemEditorProps) {
  // Reference tier: delegate to TierRefSelector.
  if (tier.referencesTier !== undefined) {
    const refTierId = tier.referencesTier;
    return (
      <div className="tokenpanel-row" data-testid={`tier-ref-row-${item.id}`}>
        <TokenLabel cssVar={item.cssVar} label={item.label} />
        <TierRefSelector
          tab={tab}
          tierId={tier.id}
          itemId={item.id}
          value={value}
          onChange={onChange}
          previewValueFor={(refItemId) => {
            const result = resolveTierItemValue(tab, refTierId, refItemId, overrides);
            return result.kind === 'literal' ? result.value : result.targetCssVar;
          }}
        />
        <HighlightToggleButton cssVar={item.cssVar} />
      </div>
    );
  }

  const type: TierValueKind = item.type;
  const isReadonly = item.readonly === true;

  switch (type.kind) {
    case 'length':
    case 'number': {
      const unit = type.kind === 'length' ? type.unit : '';
      const numeric = parseFloat(value);
      const numericForDraft = Number.isFinite(numeric) ? numeric : 0;

      // Draft lets the user type freely ("1.", "1.2") without committing on every
      // keystroke. Commit every parseable value immediately; revert on blur only
      // when the draft is empty or unparseable (no clamping).
      const [numDraft, setNumDraft] = useState<string>(String(numericForDraft));

      // Sync draft when external value changes (reset, preset load, etc.)
      useEffect(() => {
        setNumDraft(String(Number.isFinite(parseFloat(value)) ? parseFloat(value) : 0));
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [value]);

      const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.currentTarget.value;
        setNumDraft(raw);
        const n = parseFloat(raw);
        // Commit every parseable value; skip unparseable mid-typing drafts.
        if (!Number.isFinite(n)) return;
        onChange(item.id, unit ? `${n}${unit}` : String(n));
      };

      // On blur: revert unparseable drafts to last-known-good. No clamping.
      const handleNumberBlur = () => {
        const n = parseFloat(numDraft);
        if (!Number.isFinite(n)) {
          setNumDraft(String(numericForDraft));
        }
        // Parseable values were already committed on each keystroke; nothing more to do.
      };

      return (
        <div className="tokenpanel-row--stacked" data-testid={`tier-item-${item.id}`}>
          <div className="tokenpanel-row-head">
            <TokenLabel cssVar={item.cssVar} label={item.label} />
            <div className="tokenpanel-row-input-group">
              <input
                type="text"
                inputMode="decimal"
                value={numDraft}
                onChange={handleNumber}
                onBlur={handleNumberBlur}
                disabled={isReadonly}
                className="tokenpanel-row-number-input"
                aria-label={`${item.cssVar} value`}
              />
              {unit && <span className="tokenpanel-row-unit">{unit}</span>}
            </div>
            <HighlightToggleButton cssVar={item.cssVar} />
          </div>
        </div>
      );
    }

    case 'select': {
      const options = type.options;
      const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(item.id, e.currentTarget.value);
      };
      return (
        <div className="tokenpanel-row" data-testid={`tier-item-${item.id}`}>
          <TokenLabel cssVar={item.cssVar} label={item.label} />
          <select
            value={value}
            onChange={handleChange}
            disabled={isReadonly}
            className="tokenpanel-row-select"
            aria-label={`${item.cssVar} value`}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <HighlightToggleButton cssVar={item.cssVar} />
        </div>
      );
    }

    case 'text':
    case 'cursor':
    case 'content':
    case 'mask-image': {
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(item.id, e.currentTarget.value);
      };
      return (
        <div className="tokenpanel-row" data-testid={`tier-item-${item.id}`}>
          <TokenLabel cssVar={item.cssVar} label={item.label} />
          <input
            type="text"
            value={value}
            onChange={handleChange}
            disabled={isReadonly}
            className="tokenpanel-row-text-input"
            aria-label={`${item.cssVar} value`}
            spellcheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
          />
          <HighlightToggleButton cssVar={item.cssVar} />
        </div>
      );
    }

    case 'color': {
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(item.id, e.currentTarget.value);
      };
      return (
        <div className="tokenpanel-row" data-testid={`tier-item-${item.id}`}>
          <TokenLabel cssVar={item.cssVar} label={item.label} />
          <input
            type="color"
            value={value}
            onChange={handleChange}
            disabled={isReadonly}
            className="tokenpanel-row-color-input"
            aria-label={`${item.cssVar} value`}
          />
          <HighlightToggleButton cssVar={item.cssVar} />
        </div>
      );
    }

    default: {
      // Exhaustiveness guard — TypeScript narrows this to never if all cases
      // above are covered. At runtime it is a defensive no-op.
      void (type as never);
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Tier section
// ---------------------------------------------------------------------------

interface TierSectionProps {
  tab: TabConfig;
  tier: TierConfig;
  overrides: Record<string, string>;
  fullOverrides: TabOverrides;
  onItemChange: (tierId: string, itemId: string, next: string) => void;
}

function TierSection({ tab, tier, overrides, fullOverrides, onItemChange }: TierSectionProps) {
  const handleItemChange = useCallback(
    (itemId: string, next: string) => {
      onItemChange(tier.id, itemId, next);
    },
    [onItemChange, tier.id],
  );

  return (
    <div className="tokenpanel-tab-section" data-testid={`tier-section-${tier.id}`}>
      <div
        role="heading"
        aria-level={3}
        className="tokenpanel-tab-section-heading"
      >
        {tier.label}
      </div>
      <div className="tokenpanel-tab-grid">
        {tier.items.map((item) => {
          const value = overrides[item.id] ?? item.default;
          return (
            <ItemEditor
              key={item.id}
              tab={tab}
              tier={tier}
              item={item}
              value={value}
              overrides={fullOverrides}
              onChange={handleItemChange}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GenericTab props
// ---------------------------------------------------------------------------

export interface GenericTabProps {
  /** The tab configuration to render. Must NOT be a reserved id. */
  tab: TabConfig;
  /**
   * Current per-tier, per-item overrides for this tab.
   *
   * Shape: { [tierId]: { [itemId]: overrideValue } }
   *
   * When an item has no override, its `TierItem.default` is used.
   */
  overrides: TabOverrides;
  /** Called when the user commits a change to any item. */
  onChange: (tierId: string, itemId: string, next: string) => void;
}

// ---------------------------------------------------------------------------
// GenericTab
// ---------------------------------------------------------------------------

/**
 * Renders a non-reserved tab (any TabConfig whose id is not color/font/
 * spacing/size). Dispatches each tier to TierSection, which in turn renders
 * item editors by value kind.
 *
 * Reserved-id tabs (color/font/spacing/size) are handled by their dedicated
 * components until Wave 5 migrates them to consume TabConfig.tiers.
 */
export default function GenericTab({ tab, overrides, onChange }: GenericTabProps) {
  const handleItemChange = useCallback(
    (tierId: string, itemId: string, next: string) => {
      onChange(tierId, itemId, next);
    },
    [onChange],
  );

  return (
    <div className="tokenpanel-tab-content" data-testid={`generic-tab-${tab.id}`}>
      {tab.tiers.map((tier) => {
        const tierOverrides = (overrides[tier.id] ?? {}) as Record<string, string>;
        return (
          <TierSection
            key={tier.id}
            tab={tab}
            tier={tier}
            overrides={tierOverrides}
            fullOverrides={overrides}
            onItemChange={handleItemChange}
          />
        );
      })}
    </div>
  );
}
