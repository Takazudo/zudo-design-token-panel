import type { JSX } from 'preact';
import type { TabConfig, TierConfig } from '../tokens/tier-model';
import { buildDashboardModel } from './model';
import type { DashboardMode, DashboardModel, DashboardRow, DashboardTier } from './types';

/** Visual samples are independent from the panel's editor kind. */
export type DashboardPreviewKind = NonNullable<TierConfig['preview']> | 'color' | 'shadow' | 'text';

export interface TokenDashboardProps {
  tabs: readonly TabConfig[];
  /** Selects declared per-mode defaults. Does not read the host or panel mode. */
  mode?: DashboardMode;
  title?: string;
  /** Optional root ID. Supply distinct IDs when rendering multiple instances. */
  id?: string;
  /** Per-variable sample choices, including text-editor colors and shadows. */
  previewOverrides?: Readonly<Record<string, DashboardPreviewKind>>;
}

function previewKind(
  row: DashboardRow,
  tier: DashboardTier,
  overrides: TokenDashboardProps['previewOverrides'],
): DashboardPreviewKind {
  return overrides?.[row.cssVar] ?? tier.preview ?? (row.kind === 'color' ? 'color' : 'text');
}

function Preview({ row, tier, kind, model }: {
  row: DashboardRow;
  tier: DashboardTier;
  kind: DashboardPreviewKind;
  model: DashboardModel;
}) {
  // A syntactically safe declaration can still require external context. In
  // either case, the readable declaration and diagnostics remain in the card.
  if (row.cssValue === null || row.resolvedValue === null || kind === 'text' || kind === 'duration') {
    return null;
  }

  // Some editor defaults are useful declarations but have no length specimen
  // (notably the `auto` pill). Do not turn an invalid clamp into a zero-width
  // bar. This is a conservative fallback, not a browser CSS validity parser.
  const resolved = row.resolvedValue.trim().toLowerCase();
  if (!resolved) return null;
  if (kind === 'bar' || kind === 'radius' || kind === 'size') {
    if (/^(?:auto|none|normal|(?:min|max)-content|stretch|content)$|^fit-content(?:\(|$)/.test(resolved)) return null;
    if (/^[+-]?(?:\d*\.)?\d+(?:ms|s)$/.test(resolved)) return null;
    if (/^[+-]?(?:\d*\.)?\d+$/.test(resolved) && Number(resolved) !== 0) return null;
  }

  const value = row.cssValue;
  let style: JSX.CSSProperties;
  let specimen = '';
  switch (kind) {
    case 'color': style = { backgroundColor: value }; break;
    case 'bar': style = { inlineSize: `clamp(0px, ${value}, 100%)` }; break;
    case 'radius': style = { borderRadius: value }; break;
    case 'shadow': style = { boxShadow: value }; break;
    case 'size': style = { fontSize: value }; specimen = 'Aa'; break;
    case 'family': style = { fontFamily: value }; specimen = 'Aa · Design tokens'; break;
    case 'weight': style = { fontWeight: value }; specimen = 'Aa · Design tokens'; break;
    case 'line-height': {
      const base = model.rows.find((candidate) => candidate.cssVar === tier.previewBase);
      style = {
        lineHeight: value,
        ...(base?.cssValue !== null && base?.resolvedValue != null
          ? { fontSize: `var(${base.cssVar})` }
          : {}),
      };
      specimen = 'Design tokens\nDesign tokens';
      break;
    }
  }

  return (
    <div className={`zdtp-dashboard__preview zdtp-dashboard__preview--${kind}`} aria-hidden="true">
      <span className={`zdtp-dashboard__sample zdtp-dashboard__sample--${kind}`} style={style}>
        {specimen}
      </span>
    </div>
  );
}

/**
 * A complete, read-only inventory of declared defaults. Works with Preact's
 * server renderer without hydration, browser globals, or panel configuration.
 * Include @takazudo/zdtp/dashboard/styles.css through the host's CSS pipeline.
 */
export function TokenDashboard({
  tabs,
  mode = 'light',
  title = 'Token dashboard',
  id,
  previewOverrides,
}: TokenDashboardProps) {
  const model = buildDashboardModel(tabs, mode);
  const diagnosticRows = model.rows.filter((row) => row.diagnostics.length > 0).length;

  return (
    <div id={id} className="zdtp-dashboard" role="region" aria-label={title} data-mode={mode}>
      <div className="zdtp-dashboard__header">
        <div role="heading" aria-level={2} className="zdtp-dashboard__title">{title}</div>
        <div className="zdtp-dashboard__summary">
          <span className="zdtp-dashboard__count">{model.rows.length} tokens</span>
          <span>Declared defaults · {mode} mode</span>
          {diagnosticRows > 0 && <span>{diagnosticRows} with diagnostics</span>}
        </div>
      </div>
      {/* One local graph per instance keeps expressions intact without repeating
          every declaration per row. Chrome never reads inventory variables. */}
      <div className="zdtp-dashboard__inventory" style={{ ...model.declarations, colorScheme: mode }}>
        {model.rows.length === 0 && <div className="zdtp-dashboard__empty">No tokens declared.</div>}
        {model.tabs.map((tab) => (
          <div key={tab.key} className="zdtp-dashboard__tab" role="group" aria-label={tab.label}>
            <div className="zdtp-dashboard__tab-header">
              <div role="heading" aria-level={3} className="zdtp-dashboard__tab-title">{tab.label}</div>
              <span className="zdtp-dashboard__tab-count">
                {tab.tiers.reduce((count, tier) => count + tier.rows.length, 0)} tokens
              </span>
            </div>
            {tab.tiers.map((tier) => (
              <div key={tier.key} className="zdtp-dashboard__tier">
                <div role="heading" aria-level={4} className="zdtp-dashboard__tier-title">{tier.label}</div>
                <div className="zdtp-dashboard__grid" role="list" aria-label={tier.label}>
                  {tier.rows.map((row) => (
                    <div key={row.key} className="zdtp-dashboard__token" role="listitem" data-css-var={row.cssVar}>
                      <Preview row={row} tier={tier} kind={previewKind(row, tier, previewOverrides)} model={model} />
                      <div className="zdtp-dashboard__token-content">
                        <div className="zdtp-dashboard__name">{row.label}</div>
                        <div className="zdtp-dashboard__variable">{row.cssVar}</div>
                        <div className="zdtp-dashboard__value">{row.declaredValue || '(empty)'}</div>
                        {row.cssValue !== null && row.cssValue !== row.declaredValue && (
                          <div className="zdtp-dashboard__reference">CSS: {row.cssValue}</div>
                        )}
                        {row.references.length > 0 && (
                          <div className="zdtp-dashboard__reference">
                            References: {row.references.map((reference) => reference.cssVar).join(', ')}
                          </div>
                        )}
                        {row.diagnostics.map((diagnostic, index) => (
                          <div key={index} className="zdtp-dashboard__diagnostic" data-diagnostic={diagnostic.code}>
                            {diagnostic.severity === 'error' ? 'Unavailable' : 'Context needed'}: {diagnostic.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
