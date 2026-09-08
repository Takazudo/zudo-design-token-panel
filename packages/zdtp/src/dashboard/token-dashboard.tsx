import type { JSX } from 'preact';
import type { TabConfig, TierConfig } from '../tokens/tier-model';
import { buildDashboardModel } from './model';
import type { DashboardChrome, DashboardMode, DashboardModel, DashboardRow, DashboardTier } from './types';

/** Visual samples are independent from the panel's editor kind. */
export type DashboardPreviewKind = NonNullable<TierConfig['preview']> | 'color' | 'shadow' | 'text';

export interface TokenDashboardProps {
  tabs: readonly TabConfig[];
  /** Selects declared per-mode defaults. Does not read the host or panel mode. */
  mode?: DashboardMode;
  /** Selects chrome appearance (shell, cards, labels, borders, diagnostics and
   * focus/scroll affordances), independently of mode's declared defaults.
   * 'host' inherits the host's effective color-scheme. Defaults to 'light'. */
  chrome?: DashboardChrome;
  title?: string;
  /** Static multiline typography specimen. Empty strings are preserved. */
  previewText?: string;
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

const DEFAULT_PREVIEW_TEXT = 'Good typography gives every idea room to breathe. Compare the rhythm of several lines, the shapes of letters, and the distance between words. A token becomes useful when you can see it in context.\n\n読みやすさは、文字の大きさだけでは決まりません。行間と余白を比べて、心地よいリズムを探しましょう。0123456789';

function isTypography(kind: DashboardPreviewKind): boolean {
  return ['size', 'family', 'weight', 'line-height'].includes(kind);
}

/** Prove only direct local aliases and px/rem literals; never evaluate CSS. */
function rulerLength(row: DashboardRow, model: DashboardModel): string | null {
  const visited = new Set<string>();
  let current = row;
  while (current.cssValue !== null && current.resolvedValue !== null && !visited.has(current.key)) {
    visited.add(current.key);
    const value = current.resolvedValue.trim();
    if (/^(?:0|\+?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem))$/i.test(value)) return value;
    const alias = /^var\(\s*(--[a-zA-Z0-9_-]+)\s*\)$/.exec(value);
    if (!alias) return null;
    const candidates = model.rows.filter((candidate) => candidate.cssVar === alias[1]);
    if (candidates.length !== 1) return null;
    current = candidates[0];
  }
  return null;
}

function Preview({ row, tier, kind, model, previewText }: {
  row: DashboardRow;
  tier: DashboardTier;
  kind: DashboardPreviewKind;
  model: DashboardModel;
  previewText: string;
}) {
  if (kind === 'bar') {
    const length = rulerLength(row, model);
    if (length === null) return <div className="zdtp-dashboard__preview-unavailable">Ruler unavailable: requires a nonnegative px/rem length or a resolved direct alias.</div>;
    return <div className="zdtp-dashboard__ruler-wrap">
      <div className="zdtp-dashboard__ruler-caption">Actual size · ticks every 8 CSS px · major ticks every 64 CSS px</div>
      <div className="zdtp-dashboard__scroll zdtp-dashboard__ruler-scroll" role="region" tabIndex={0} aria-label={`${row.label} (${row.cssVar}) actual-size ruler`}>
        <div className="zdtp-dashboard__ruler" style={{ inlineSize: `max(100%, ${length})` }}>
          <div className="zdtp-dashboard__ruler-origin">0</div>
          <div className="zdtp-dashboard__specimen" style={{ colorScheme: model.mode }}>
            <span className="zdtp-dashboard__sample zdtp-dashboard__sample--bar" style={{ inlineSize: length }} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>;
  }
  if (row.cssValue === null || row.resolvedValue === null || kind === 'text' || kind === 'duration') return null;
  const resolved = row.resolvedValue.trim().toLowerCase();
  if (!resolved) return null;
  if (kind === 'radius' || kind === 'size') {
    if (/^(?:auto|none|normal|(?:min|max)-content|stretch|content)$|^fit-content(?:\(|$)/.test(resolved)) return null;
    if (/^[+-]?(?:\d*\.)?\d+(?:ms|s)$/.test(resolved)) return null;
    if (/^[+-]?(?:\d*\.)?\d+$/.test(resolved) && Number(resolved) !== 0) return null;
  }
  const value = row.cssValue;
  let style: JSX.CSSProperties;
  switch (kind) {
    case 'color': style = { backgroundColor: value }; break;
    case 'radius': style = { borderRadius: value }; break;
    case 'shadow': style = { boxShadow: value }; break;
    case 'size': style = { fontSize: value }; break;
    case 'family': style = { fontFamily: value }; break;
    case 'weight': style = { fontWeight: value }; break;
    case 'line-height': {
      const base = model.rows.find((candidate) => candidate.cssVar === tier.previewBase);
      style = { lineHeight: value, ...(base?.cssValue !== null && base?.resolvedValue != null ? { fontSize: `var(${base.cssVar})` } : {}) };
      break;
    }
  }
  const typography = isTypography(kind);
  return (
    <div className={`zdtp-dashboard__preview zdtp-dashboard__preview--${kind}${typography ? ' zdtp-dashboard__preview--typography zdtp-dashboard__scroll' : ''}`}
      aria-hidden={typography ? undefined : 'true'} role={typography ? 'region' : undefined}
      tabIndex={typography ? 0 : undefined} aria-label={typography ? `${row.label} (${row.cssVar}) typography specimen` : undefined}>
      <div className="zdtp-dashboard__specimen" style={{ colorScheme: model.mode }}>
        <span className={`zdtp-dashboard__sample zdtp-dashboard__sample--${kind}`} style={style}>
          {typography ? previewText : ''}
        </span>
      </div>
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
  chrome = 'light',
  title = 'Token dashboard',
  id,
  previewOverrides,
  previewText = DEFAULT_PREVIEW_TEXT,
}: TokenDashboardProps) {
  const model = buildDashboardModel(tabs, mode);
  const diagnosticRows = model.rows.filter((row) => row.diagnostics.length > 0).length;

  return (
    <div id={id} className="zdtp-dashboard" role="region" aria-label={title} data-mode={mode} data-chrome={chrome}>
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
      <div className="zdtp-dashboard__inventory" style={model.declarations}>
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
                <div className={tier.palette ? 'zdtp-dashboard__scroll zdtp-dashboard__palette-scroll' : undefined} role={tier.palette ? 'region' : undefined} tabIndex={tier.palette ? 0 : undefined} aria-label={tier.palette ? `${tier.label} palette stops` : undefined}>
                  <div className={`zdtp-dashboard__grid${tier.palette ? ' zdtp-dashboard__palette' : ''}`} role="list" aria-label={tier.label}>
                    {tier.rows.map((row) => {
                      const kind = previewKind(row, tier, previewOverrides);
                      const wide = !tier.palette && (kind === 'bar' || isTypography(kind));
                      return (
                      <div key={row.key} className={`zdtp-dashboard__token${wide ? ' zdtp-dashboard__token--wide' : ''}`} role="listitem" data-css-var={row.cssVar}>
                        <Preview row={row} tier={tier} kind={kind} model={model} previewText={previewText} />
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
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
