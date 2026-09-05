import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { converter, wcagContrast } from 'culori';

const PACKAGE_SRC = path.resolve(__dirname, '..');
const PANEL_TOKENS = fs.readFileSync(path.join(PACKAGE_SRC, 'styles/panel-tokens.css'), 'utf8');
const COMPONENT_STYLES = [
  'styles/panel.css',
  'components/color-picker/color-picker.css',
  'components/palette-chart/palette-chart.css',
  'tabs/palette/palette-edit-view.css',
  'tabs/palette/palette-check-view.css',
  'specimen/specimen.css',
  'element-inspect/element-inspect.css',
].map((relativePath) => ({
  relativePath,
  source: fs.readFileSync(path.join(PACKAGE_SRC, relativePath), 'utf8'),
}));

const neutralRoles = ['bg', 'surface', 'code-bg', 'border', 'muted', 'fg', 'code-fg'] as const;

function declaration(name: string): string {
  const match = PANEL_TOKENS.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;]+)`));
  if (!match) throw new Error(`Missing ${name} declaration`);
  return match[1].trim();
}

function resolvedRole(role: string): string {
  const value = declaration(`--tokentweak-color-${role}`);
  const alias = value.match(/^var\((--tokentweak-palette-base-\d+)\)$/);
  return alias ? declaration(alias[1]) : value;
}

describe('panel chrome color tokens', () => {
  it('declares a monotonic dark-to-light neutral ramp', () => {
    const toOklch = converter('oklch');
    const ramp = [...PANEL_TOKENS.matchAll(/--tokentweak-palette-base-(\d+)\s*:\s*([^;]+)/g)]
      .map((match) => ({ index: Number(match[1]), color: toOklch(match[2].trim()) }))
      .sort((a, b) => a.index - b.index);

    expect(ramp).toHaveLength(7);
    for (const [index, stop] of ramp.entries()) {
      expect(stop.index).toBe(index);
      expect(stop.color?.c).toBe(0);
      if (index > 0) expect(stop.color!.l).toBeGreaterThan(ramp[index - 1].color!.l);
    }
  });

  it('keeps semantic roles as aliases onto the private ramp', () => {
    for (const role of neutralRoles) {
      expect(declaration(`--tokentweak-color-${role}`), role).toMatch(
        /^var\(--tokentweak-palette-base-\d+\)$/,
      );
    }
  });

  it.each([
    ['fg', 'surface', 4.6],
    ['muted', 'surface', 4.6],
    ['fg', 'bg', 4.6],
    ['muted', 'bg', 4.6],
    ['code-fg', 'code-bg', 4.6],
    ['border', 'surface', 3.1],
    ['border', 'bg', 3.1],
    ['bg', 'accent', 4.6],
  ])('%s on %s clears its contrast target', (foreground, background, minimum) => {
    expect(wcagContrast(resolvedRole(foreground), resolvedRole(background))).toBeGreaterThanOrEqual(
      minimum,
    );
  });

  it('keeps palette stops out of component CSS', () => {
    for (const { relativePath, source } of COMPONENT_STYLES) {
      expect(source, relativePath).not.toMatch(/var\(\s*--tokentweak-palette-/);
    }
  });

  it('keeps muted text out of structural border properties', () => {
    for (const { relativePath, source } of COMPONENT_STYLES) {
      expect(source, relativePath).not.toMatch(
        /(?:border(?:-(?:top|right|bottom|left|color))?|outline|box-shadow)\s*:[^;]*var\(\s*--tokentweak-color-muted/s,
      );
    }
  });
});
