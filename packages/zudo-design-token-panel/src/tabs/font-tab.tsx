import { useCallback, useMemo } from 'preact/compat';
import SelectRow from '../controls/select-row';
import SliderRow from '../controls/slider-row';
import TextRow from '../controls/text-row';
import { FONT_GROUP_ORDER, GROUP_TITLES, type TokenDef } from '../tokens/manifest';
import { getPanelConfig } from '../config/panel-config';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistFont } from '../state/persist';

interface FontTabProps {
  state: TokenOverrides;
  persistFont: PersistFont;
}

/**
 * Font tab — manifest-driven.
 *
 * Top-level sections (in `FONT_GROUP_ORDER`):
 *   - FONT SIZES        → slider rows (`--text-*`)
 *   - LINE HEIGHTS      → slider rows (`--leading-*`, unitless)
 *   - FONT WEIGHTS      → select rows (`--font-weight-*`, 100..900)
 *   - FONT FAMILIES     → text rows   (`--font-sans`, `--font-mono`)
 *
 * Advanced disclosure (`<details>`, collapsed by default) reveals the Tier 1
 * abstract scale (`--text-scale-*`). The Tier 2 font-size tokens above resolve
 * from these via `var()` in `global.css`, so edits to the scale cascade
 * automatically to the primary size rows without any extra wiring here.
 */
export default function FontTab({ state, persistFont }: FontTabProps) {
  const handleChange = useCallback(
    (id: string, next: string) => {
      persistFont((prev) => ({ ...prev, [id]: next }));
    },
    [persistFont],
  );

  const handleResetAll = useCallback(() => {
    persistFont(() => ({}));
  }, [persistFont]);

  // Read the manifest from runtime config (consumer-supplied).
  // Note the field is `typography` (not `font`) per PORTABLE-CONTRACT.md §3.3
  // — that's the persist envelope's slice name. Group ordering and section
  // titles fall back to the package-bundled defaults when the manifest
  // doesn't override them.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tokens = useMemo(() => getPanelConfig().tokens, []);
  const fontTokens = tokens.typography;
  const fontGroupOrder = tokens.fontGroupOrder ?? FONT_GROUP_ORDER;
  const groupTitles = tokens.groupTitles ?? GROUP_TITLES;

  // Group tokens once. Primary groups come from `fontGroupOrder`; everything
  // flagged `advanced` goes into the disclosure section.
  const { primary, advanced } = useMemo(() => {
    const primary = new Map<string, TokenDef[]>();
    const advanced: TokenDef[] = [];
    for (const t of fontTokens) {
      if (t.advanced) {
        advanced.push(t);
        continue;
      }
      const arr = primary.get(t.group) ?? [];
      arr.push(t);
      primary.set(t.group, arr);
    }
    return { primary, advanced };
  }, [fontTokens]);

  return (
    <div className="tokenpanel-tab-content">
      {/* Tab-level actions */}
      <div className="tokenpanel-tab-actions">
        <button type="button" onClick={handleResetAll} className="tokenpanel-action-link">
          Reset Font
        </button>
      </div>

      {fontGroupOrder.map((group) => {
        const sectionTokens = primary.get(group);
        if (!sectionTokens || sectionTokens.length === 0) return null;
        return (
          <section key={group} className="tokenpanel-tab-section">
            <h3 className="tokenpanel-tab-section-heading">{groupTitles[group] ?? group}</h3>
            <div className="tokenpanel-tab-grid">
              {sectionTokens.map((token) => (
                // Pass `handleChange` directly — TokenRow forwards it to the
                // memoised row primitives whose (id, next) signature lets us
                // share one stable handler across all rows.
                <TokenRow
                  key={token.id}
                  token={token}
                  value={state[token.id] ?? token.default}
                  onChange={handleChange}
                />
              ))}
            </div>
          </section>
        );
      })}

      {advanced.length > 0 && (
        <details className="tokenpanel-tab-advanced">
          <summary className="tokenpanel-tab-advanced-summary">
            {groupTitles['font-scale'] ?? 'font-scale'}
          </summary>
          <div className="tokenpanel-tab-advanced-grid">
            {advanced.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                value={state[token.id] ?? token.default}
                onChange={handleChange}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * Dispatch to the right control based on `token.control`. Defaults to slider.
 *
 * `onChange` carries the `(id, next)` signature so the parent can use a
 * single stable handler across every row, keeping React.memo on each row
 * primitive effective.
 */
function TokenRow({
  token,
  value,
  onChange,
}: {
  token: TokenDef;
  value: string;
  onChange: (id: string, next: string) => void;
}) {
  switch (token.control) {
    case 'select':
      return <SelectRow token={token} value={value} onChange={onChange} />;
    case 'text':
      return <TextRow token={token} value={value} onChange={onChange} />;
    case 'slider':
    default:
      return <SliderRow token={token} value={value} onChange={onChange} />;
  }
}
