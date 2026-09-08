import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// Run playground typecheck/build first to generate its build-info module; CI builds it before tests.
import { panelConfig } from '../../../../playground/config/panel-config';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));

describe('playground grouped palette config', () => {
  it('passes the built public validator with a fresh storage namespace', () => {
    // Bypass Vitest's source alias: this consumer checks the actual public export.
    const output = execFileSync(process.execPath, ['--input-type=module', '--eval', `
      import { assertValidPanelConfig } from '@takazudo/zdtp';
      assertValidPanelConfig(${JSON.stringify(panelConfig)});
      console.log('validated');
    `], { cwd: packageRoot, encoding: 'utf8' });
    expect(output.trim()).toBe('validated');
    expect(panelConfig.storagePrefix).toBe('zfb-playground-tokens-v2');
  });

  it('keeps semantic defaults connected to declared immutable ramps', () => {
    const palette = panelConfig.tabs.find((tab) => tab.id === 'palette')!;
    const color = panelConfig.tabs.find((tab) => tab.id === 'color')!;
    expect(palette.colorExtras).toBeUndefined();
    expect(palette.tiers.map((tier) => [tier.id, tier.items.length])).toEqual([
      ['base', 7], ['brand', 5], ['accent', 4], ['state', 4],
    ]);
    expect(color.tiers).toHaveLength(1);
    const semantic = color.tiers[0];
    expect(semantic.semantic).toBe(true);
    expect(semantic.referencesTier).toBeUndefined();
    expect(semantic.referencesRamps).toEqual(palette.tiers.map((tier) => ({ tab: 'palette', tier: tier.id })));
    const tokensByRef = new Map<string, string>(palette.tiers.flatMap((tier) => tier.items.map((item) => {
      expect(item.type).toEqual({ kind: 'color', format: 'oklch' });
      return [`${tier.id}:${item.id}`, item.cssVar] as const;
    })));
    const rampVars = new Set(tokensByRef.values());
    const overrides = color.colorExtras!.semanticDefaults!;
    expect(Object.keys(overrides)).toHaveLength(11);
    expect(semantic.items.filter((item) => !(item.id in overrides)).map((item) => item.id))
      .toEqual(['success', 'danger', 'warning', 'info']);
    for (const item of semantic.items) {
      expect(tokensByRef.has(item.default)).toBe(true);
      const override = overrides[item.id];
      if (!override) continue;
      expect(override).toHaveProperty('literal');
      if (typeof override !== 'object' || !('literal' in override) || typeof override.literal === 'string') {
        throw new Error(`${item.id} must have per-mode defaults`);
      }
      expect(override.literal.light).toBe(`var(${tokensByRef.get(item.default)})`);
      for (const value of [override.literal.light, override.literal.dark]) {
        expect(value).toMatch(/^var\(--zfb-palette-[a-z]+-\d+\)$/);
        expect(rampVars.has(value.slice(4, -1))).toBe(true);
      }
    }
    expect(color.colorExtras!.colorSchemes).toEqual({});
    expect(color.colorExtras!.panelSettings).toEqual({ colorScheme: 'default', colorMode: false });
  });
});
