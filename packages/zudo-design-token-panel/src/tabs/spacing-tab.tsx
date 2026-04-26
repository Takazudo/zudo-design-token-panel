import { useCallback, useMemo } from 'preact/compat';
import SliderRow from '../controls/slider-row';
import { GROUP_ORDER, GROUP_TITLES, type TokenDef } from '../tokens/manifest';
import { getPanelConfig } from '../config/panel-config';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistSpacing } from '../state/persist';

interface SpacingTabProps {
  state: TokenOverrides;
  persistSpacing: PersistSpacing;
}

/**
 * Spacing tab — fully manifest-driven.
 *
 * Reads `panelConfig.tokens.spacing` (Sub 3 of #1550) at mount, groups by
 * `group` field, renders one `SliderRow` per token, and wires each row
 * through `persistSpacing` so CSS vars + storage stay in sync.
 *
 * The token list is captured once with `useMemo([])` because `configurePanel`
 * is one-shot per page lifecycle — a remount-grade re-config is the only
 * legal way the manifest can change, and that resets this hook anyway.
 */
export default function SpacingTab({ state, persistSpacing }: SpacingTabProps) {
  const handleChange = useCallback(
    (id: string, next: string) => {
      persistSpacing((prev) => ({ ...prev, [id]: next }));
    },
    [persistSpacing],
  );

  const handleResetAll = useCallback(() => {
    persistSpacing(() => ({}));
  }, [persistSpacing]);

  // Read the manifest from runtime config (consumer-supplied per Sub 3).
  // Group ordering and section titles fall back to the package-bundled
  // defaults when the manifest doesn't override them (Sub S5a, #1588).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tokens = useMemo(() => getPanelConfig().tokens, []);
  const spacingTokens = tokens.spacing;
  const groupOrder = tokens.spacingGroupOrder ?? GROUP_ORDER;
  const groupTitles = tokens.groupTitles ?? GROUP_TITLES;

  // Group tokens once so the render loop stays cheap and the display order
  // stays stable across re-renders. Keyed by plain string so consumer-coined
  // group ids work without changing the type.
  const grouped = useMemo(() => {
    const out: Record<string, TokenDef[]> = {};
    for (const t of spacingTokens) {
      (out[t.group] ??= []).push(t);
    }
    return out;
  }, [spacingTokens]);

  return (
    <div className="tokenpanel-tab-content">
      {/* Tab-level actions */}
      <div className="tokenpanel-tab-actions">
        <button type="button" onClick={handleResetAll} className="tokenpanel-action-link">
          Reset Spacing
        </button>
      </div>

      {groupOrder.map((group) => {
        const sectionTokens = grouped[group];
        if (!sectionTokens || sectionTokens.length === 0) return null;
        return (
          <section key={group} className="tokenpanel-tab-section">
            <h3 className="tokenpanel-tab-section-heading">{groupTitles[group] ?? group}</h3>
            <div className="tokenpanel-tab-grid">
              {sectionTokens.map((token) => {
                const value = state[token.id] ?? token.default;
                // Pass `handleChange` directly — the row supplies its own
                // `token.id` back via the (id, next) signature, so React.memo
                // on SliderRow stays effective across re-renders (PR #1440
                // review item Q3).
                return (
                  <SliderRow key={token.id} token={token} value={value} onChange={handleChange} />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
