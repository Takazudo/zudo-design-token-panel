import { useCallback, useMemo } from 'preact/compat';
import PillSliderRow from '../controls/pill-slider-row';
import SliderRow from '../controls/slider-row';
import { GROUP_TITLES, SIZE_GROUP_ORDER, type TokenDef } from '../tokens/manifest';
import { getPanelConfig } from '../config/panel-config';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistSize } from '../state/persist';

interface SizeTabProps {
  state: TokenOverrides;
  persistSize: PersistSize;
}

/**
 * Size tab — manifest-driven like Spacing, with one pill-toggle special case
 * (`--radius-full`).
 *
 * Groups: BORDER RADIUS, TRANSITIONS. If the manifest grows a new group, add
 * it to `SIZE_GROUP_ORDER` in `tokens/manifest.ts` — no code change needed
 * here.
 */
export default function SizeTab({ state, persistSize }: SizeTabProps) {
  const handleChange = useCallback(
    (id: string, next: string) => {
      persistSize((prev) => ({ ...prev, [id]: next }));
    },
    [persistSize],
  );

  const handleResetAll = useCallback(() => {
    persistSize(() => ({}));
  }, [persistSize]);

  // Read the manifest from runtime config (consumer-supplied per Sub 3).
  // Group ordering and section titles fall back to the package-bundled
  // defaults when the manifest doesn't override them (Sub S5a, #1588).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tokens = useMemo(() => getPanelConfig().tokens, []);
  const sizeTokens = tokens.size;
  const sizeGroupOrder = tokens.sizeGroupOrder ?? SIZE_GROUP_ORDER;
  const groupTitles = tokens.groupTitles ?? GROUP_TITLES;

  // Group tokens once (any group id not present simply yields undefined and
  // the render below skips it).
  const grouped = useMemo(() => {
    const out: Record<string, TokenDef[]> = {};
    for (const t of sizeTokens) {
      (out[t.group] ??= []).push(t);
    }
    return out;
  }, [sizeTokens]);

  return (
    <div className="tokenpanel-tab-content">
      {/* Tab-level actions */}
      <div className="tokenpanel-tab-actions">
        <button type="button" onClick={handleResetAll} className="tokenpanel-action-link">
          Reset Size
        </button>
      </div>

      {sizeGroupOrder.map((group) => {
        const sectionTokens = grouped[group];
        if (!sectionTokens || sectionTokens.length === 0) return null;
        return (
          <section key={group} className="tokenpanel-tab-section">
            <h3 className="tokenpanel-tab-section-heading">{groupTitles[group] ?? group}</h3>
            <div className="tokenpanel-tab-grid">
              {sectionTokens.map((token) => {
                const value = state[token.id] ?? token.default;
                // Pass `handleChange` directly — every row primitive's
                // (id, next) signature lets us share one stable handler
                // across all rows, keeping React.memo on each row effective
                // (PR #1440 review item Q3).
                if (token.pill) {
                  return (
                    <PillSliderRow
                      key={token.id}
                      token={token}
                      value={value}
                      onChange={handleChange}
                    />
                  );
                }
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
