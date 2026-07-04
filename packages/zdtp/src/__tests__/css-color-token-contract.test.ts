/**
 * Invariant M — no raw color literals in panel chrome CSS (F20, #450).
 *
 * panel-tokens.css is the intentional token-definition source; raw hex/rgba in
 * that file is by design. Every OTHER panel CSS file must route chrome colors
 * through var(--tokentweak-*) so a host retheme (assigning new values on those
 * custom properties) reaches all surfaces without hunting for hardcoded literals.
 *
 * Specific violations detected:
 *   - #e05252 (incorrect danger color; var(--tokentweak-color-danger) exists)
 *   - #222, #333, #404040 (arbitrary dark backgrounds)
 *   - rgba(255, 255, 255, ...) in panel.css chrome rules (bakes dark-scheme assumption;
 *     white-alpha overlays become invisible when a host rethemes the panel light)
 *   - rgba(255, 255, 255, ...) in swatch border rules in palette-edit-view.css
 *     (exception: on-swatch overlay text/shadow in swatch-idx is deliberate and
 *     annotated with a comment — those use the same literal but are excluded here)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '..');
const STYLES_DIR = path.join(SRC, 'styles');
const PALETTE_CSS_DIR = path.join(SRC, 'tabs/palette');
const COLOR_PICKER_CSS_PATH = path.join(SRC, 'components/color-picker/color-picker.css');

function stripCssComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '');
}

const panelChrome = fs.readFileSync(path.join(STYLES_DIR, 'panel.css'), 'utf8');
const paletteEditView = fs.readFileSync(
  path.join(PALETTE_CSS_DIR, 'palette-edit-view.css'),
  'utf8',
);
const colorPickerCss = fs.readFileSync(COLOR_PICKER_CSS_PATH, 'utf8');

// ---------------------------------------------------------------------------
// M1 — #e05252 must not appear anywhere in chrome CSS
// ---------------------------------------------------------------------------

describe('Invariant M1 — no #e05252 raw hex (use var(--tokentweak-color-danger))', () => {
  it('panel.css contains no #e05252', () => {
    expect(stripCssComments(panelChrome)).not.toContain('#e05252');
  });

  it('palette-edit-view.css contains no #e05252', () => {
    expect(stripCssComments(paletteEditView)).not.toContain('#e05252');
  });

  it('color-picker.css contains no #e05252', () => {
    expect(stripCssComments(colorPickerCss)).not.toContain('#e05252');
  });
});

// ---------------------------------------------------------------------------
// M2 — no raw dark hex backgrounds that bypass the token contract
// ---------------------------------------------------------------------------

describe('Invariant M2 — no raw #222/#333/#404040 backgrounds in panel chrome CSS', () => {
  it('panel.css has no #222 background', () => {
    expect(stripCssComments(panelChrome)).not.toContain('#222');
  });

  it('panel.css has no #333 background', () => {
    expect(stripCssComments(panelChrome)).not.toContain('#333');
  });

  it('panel.css has no #404040 background', () => {
    expect(stripCssComments(panelChrome)).not.toContain('#404040');
  });
});

// ---------------------------------------------------------------------------
// M3 — no rgba(255, 255, 255, ...) in panel.css chrome rules
//
// White-alpha overlays bake in the assumption that the panel surface is dark.
// If a host rethemes the panel to light (via the documented --tokentweak-*
// override surface), these overlays become invisible or low-contrast.
// Use rgb(from var(--tokentweak-color-fg) r g b / <alpha>) instead, which
// adapts when the host reassigns the foreground token.
//
// The only allowed white-rgba in panel.css is the elpath-toast border
// (rgb(255 255 255 / 0.08), space-separated modern syntax) which is a
// deliberate portal-toast overlay. That uses the modern `rgb(N N N / a)`
// syntax (no commas), so the comma-syntax `rgba(255, 255, 255,` regex below
// correctly excludes it.
// ---------------------------------------------------------------------------

describe('Invariant M3 — no rgba(255,255,255,...) chrome rules in panel.css', () => {
  it('panel.css has no rgba(255, 255, 255, ...) chrome color (bakes dark-scheme assumption)', () => {
    expect(stripCssComments(panelChrome)).not.toMatch(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/);
  });
});

// ---------------------------------------------------------------------------
// M4 — no rgba(255, 255, 255, ...) in swatch border rules in palette-edit-view.css
//
// The on-swatch index text overlay (swatch-idx) uses rgba(255,255,255,...) for
// a text-shadow that is intentional (readable against any swatch color,
// independent of the chrome theme) and carries a comment explaining this.
// Only the BORDER property is checked here; the text-shadow is deliberately
// excluded from this invariant.
// ---------------------------------------------------------------------------

describe('Invariant M4 — palette-edit-view.css swatch borders use token-relative colors', () => {
  it('palette-edit-view.css has no rgba(255,255,255,...) in a border property', () => {
    const stripped = stripCssComments(paletteEditView);
    // Find every `border[^;]*` property value and check for white-rgba
    const borderProps = stripped.match(/border[^;]*;/g) ?? [];
    const offending = borderProps.filter((b) =>
      /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/.test(b),
    );
    expect(offending).toHaveLength(0);
  });
});
