/**
 * GenericTab — renders any TabConfig whose id is not one of the reserved ids
 * (color / font / spacing / size). Reserved ids continue to dispatch to their
 * dedicated tab components until Wave 5 migrates them.
 *
 * Renders the tab's tiers in declaration order. Each tier shows a heading and
 * its items via kind-appropriate controls:
 *
 *   length / number → slider + number input (numeric range)
 *   select          → native <select>
 *   text            → free-form text input
 *   color           → <input type="color"> (native OS color picker)
 *
 * For items in a tier with `referencesTier`, TierRefSelector is rendered
 * instead, so the user can either pick a tier-1 item id (emitted as
 * `var(--target-cssvar)` at apply time) or flip the item back to literal mode.
 */

import { useCallback } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem, TierValueKind } from '../tokens/tier-model';
import type { TabOverrides } from '../apply/tier-resolver';
import TierRefSelector from '../controls/tier-ref-selector';

// ---------------------------------------------------------------------------
// Item editor dispatch
// ---------------------------------------------------------------------------

interface ItemEditorProps {
  tab: TabConfig;
  tier: TierConfig;
  item: TierItem;
  value: string;
  /** Called with (itemId, newValue) when the user commits a change. */
  onChange: (itemId: string, next: string) => void;
}

/**
 * Dispatch to TierRefSelector for reference tiers, otherwise render the
 * kind-appropriate editor (slider, select, text, color).
 */
function ItemEditor({ tab, tier, item, value, onChange }: ItemEditorProps) {
  // Reference tier: delegate to TierRefSelector.
  if (tier.referencesTier !== undefined) {
    return (
      <div className="tokenpanel-row" data-testid={`tier-ref-row-${item.id}`}>
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

  const type: TierValueKind = item.type;
  const isReadonly = item.readonly === true;

  switch (type.kind) {
    case 'length':
    case 'number': {
      const unit = type.kind === 'length' ? type.unit : '';
      const min = type.min;
      const max = type.max;
      const step = type.step;
      const numeric = parseFloat(value);
      const displayNumeric = Number.isFinite(numeric) ? numeric : min;

      const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        const n = Number(e.currentTarget.value);
        if (!Number.isFinite(n)) return;
        onChange(item.id, unit ? `${n}${unit}` : String(n));
      };

      const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.currentTarget.value;
        const n = parseFloat(raw);
        if (!Number.isFinite(n)) return;
        const clamped = Math.min(max, Math.max(min, n));
        onChange(item.id, unit ? `${clamped}${unit}` : String(clamped));
      };

      return (
        <div className="tokenpanel-row--stacked" data-testid={`tier-item-${item.id}`}>
          <div className="tokenpanel-row-head">
            <span className="tokenpanel-row-label" title={item.cssVar}>
              {item.cssVar}
              {item.label !== item.cssVar && (
                <span className="tokenpanel-row-label-sub">{item.label}</span>
              )}
            </span>
            <div className="tokenpanel-row-input-group">
              <input
                type="text"
                inputMode="decimal"
                value={displayNumeric}
                onChange={handleNumber}
                disabled={isReadonly}
                className="tokenpanel-row-number-input"
                aria-label={`${item.cssVar} value`}
              />
              {unit && <span className="tokenpanel-row-unit">{unit}</span>}
            </div>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayNumeric}
            onChange={handleSlider}
            disabled={isReadonly}
            className="tokenpanel-row-slider"
            aria-label={`${item.cssVar} slider`}
          />
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
          <span className="tokenpanel-row-label" title={item.cssVar}>
            {item.cssVar}
            {item.label !== item.cssVar && (
              <span className="tokenpanel-row-label-sub">{item.label}</span>
            )}
          </span>
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
        </div>
      );
    }

    case 'text': {
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(item.id, e.currentTarget.value);
      };
      return (
        <div className="tokenpanel-row" data-testid={`tier-item-${item.id}`}>
          <span className="tokenpanel-row-label" title={item.cssVar}>
            {item.cssVar}
            {item.label !== item.cssVar && (
              <span className="tokenpanel-row-label-sub">{item.label}</span>
            )}
          </span>
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
        </div>
      );
    }

    case 'color': {
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(item.id, e.currentTarget.value);
      };
      return (
        <div className="tokenpanel-row" data-testid={`tier-item-${item.id}`}>
          <span className="tokenpanel-row-label" title={item.cssVar}>
            {item.cssVar}
            {item.label !== item.cssVar && (
              <span className="tokenpanel-row-label-sub">{item.label}</span>
            )}
          </span>
          <input
            type="color"
            value={value}
            onChange={handleChange}
            disabled={isReadonly}
            className="tokenpanel-row-color-input"
            aria-label={`${item.cssVar} value`}
          />
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
  onItemChange: (tierId: string, itemId: string, next: string) => void;
}

function TierSection({ tab, tier, overrides, onItemChange }: TierSectionProps) {
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
            onItemChange={handleItemChange}
          />
        );
      })}
    </div>
  );
}
