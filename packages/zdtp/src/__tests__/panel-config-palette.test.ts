import { describe, expect, it } from 'vitest';
import { assertValidPanelConfig, DEFAULT_PANEL_CONFIG } from '../config/panel-config';
import { zudoDocConfigs } from '../../../../playground/config/zudo-doc-manifest.generated';

function config(cssVars = ['--warm-0', '--warm-1']) {
  return {
    ...DEFAULT_PANEL_CONFIG,
    tabs: [
      {
        id: 'palette',
        label: 'Palette',
        tiers: [
          {
            id: 'warm',
            label: 'Warm',
            items: cssVars.map((cssVar, i) => ({
              id: `warm-${i}`,
              label: `${i}`,
              cssVar,
              default: '#ffffff',
              type: { kind: 'color' },
            })),
          },
        ],
      },
    ],
  };
}

describe('reserved palette tab validation', () => {
  it.each(Object.entries(zudoDocConfigs))('accepts vendored zudo-doc %s config', (_, manifest) => {
    expect(() => assertValidPanelConfig(manifest)).not.toThrow();
  });

  it.each([{}, null, false])('rejects colorExtras %j with the runtime reason', (colorExtras) => {
    const value = config();
    Object.assign(value.tabs[0], { colorExtras });
    expect(() => assertValidPanelConfig(value)).toThrow(
      /tabs\["palette"\].colorExtras.*resolveColorClusterFromTab/,
    );
  });

  it('rejects an empty tier', () => {
    expect(() => assertValidPanelConfig(config([]))).toThrow(/tiers\["warm"\].items must be non-empty/);
  });

  it('rejects non-color tiers', () => {
    const value = config();
    value.tabs[0].tiers[0].items.forEach((item) => {
      item.type.kind = 'text';
    });
    expect(() => assertValidPanelConfig(value)).toThrow(/type.kind must be "color"/);
  });

  it.each([
    ['--warm-0', '--cool-1'],
    ['--warm-0', '--warm-2'],
    ['--warm-1', '--warm-0'],
    ['--warm', '--cool'],
    ['--warm-danger', '--cool-warning'],
    ['--warm-danger', '--warm-1'],
    ['--warm-0', '--warm-danger'],
    ['--warm', '--warm'],
    ['--warm-00', '--warm-01'],
  ])('rejects inconsistent cssVar families %j, %j', (first, second) => {
    expect(() => assertValidPanelConfig(config([first, second]))).toThrow(/one prefix/);
  });

  it.each([
    ['--warm-0', '--warm-1'],
    ['--warm-1', '--warm-2'],
    ['--warm'],
    ['--warm-danger', '--warm-warning'],
  ])('accepts supported numbered and named cssVars %j', (...cssVars) => {
    expect(() => assertValidPanelConfig(config(cssVars))).not.toThrow();
  });

  it('checks every tier', () => {
    const value = config();
    value.tabs[0].tiers.push({ id: 'cool', label: 'Cool', items: [] });
    expect(() => assertValidPanelConfig(value)).toThrow(/tiers\["cool"\].items must be non-empty/);
  });
});
