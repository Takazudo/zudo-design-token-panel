import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// CI generates the Wind demo's build-info module before tests.
import { panelConfig } from '../../../../demos/zudowind/config/panel-config';

const windRoot = fileURLToPath(new URL('../../../../demos/zudowind/', import.meta.url));

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));

describe('Wind demo panel config', () => {
  it('passes the built public validator with a fresh storage namespace', () => {
    // Bypass Vitest's source alias: this consumer checks the actual public export.
    const output = execFileSync(process.execPath, ['--input-type=module', '--eval', `
      import { assertValidPanelConfig } from '@takazudo/zdtp';
      assertValidPanelConfig(${JSON.stringify(panelConfig)});
      console.log('validated');
    `], { cwd: packageRoot, encoding: 'utf8' });
    expect(output.trim()).toBe('validated');
    expect(panelConfig.storagePrefix).toBe('zdtp-demo-zudowind-tokens-v1');
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
        expect(value).toMatch(/^var\(--demo-palette-[a-z]+-\d+\)$/);
        expect(rampVars.has(value.slice(4, -1))).toBe(true);
      }
    }
    expect(color.colorExtras!.colorSchemes).toEqual({});
    expect(color.colorExtras!.panelSettings).toEqual({ colorScheme: 'default', colorMode: false });
  });

  it('keeps Spacing tiers aligned with tokens.css and wind utilities', () => {
    const spacing = panelConfig.tabs.find((tab) => tab.id === 'spacing')!;
    expect(spacing.tiers.map((tier) => [tier.id, tier.items.length])).toEqual([
      ['card-space', 1],
      ['hsp-scale', 5],
      ['vsp-scale', 7],
    ]);
    expect(spacing.tiers.some((tier) => tier.id === 'spacing-scale')).toBe(false);

    const tokens = readFileSync(join(windRoot, 'styles/tokens.css'), 'utf8');
    for (const item of spacing.tiers.flatMap((tier) => tier.items)) {
      expect(tokens).toContain(`${item.cssVar}:`);
    }

    const windConfig = readFileSync(join(windRoot, 'zfb.config.ts'), 'utf8');
    const manifestVars = new Set(panelConfig.tabs.flatMap((tab) => tab.tiers.flatMap((tier) => tier.items.map((item) => item.cssVar))));
    const references = [...windConfig.matchAll(/var\((--demo-[a-z0-9-]+)\)/g)].map((match) => match[1]);
    expect(references).toEqual([
      '--demo-space-card',
      '--demo-radius-card',
      '--demo-surface',
      '--demo-ink',
    ]);
    for (const reference of references) expect(manifestVars.has(reference)).toBe(true);
  });
});
