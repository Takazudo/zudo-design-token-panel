import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { PanelConfig } from '@takazudo/zdtp';
import type { PanelConfig as TestingPanelConfig } from '@takazudo/zdtp/testing';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));

function config(valid: boolean): PanelConfig & TestingPanelConfig {
  return {
    storagePrefix: 'public-validator',
    consoleNamespace: 'publicValidator',
    modalClassPrefix: 'public-validator-modal',
    schemaId: 'public-validator/v1',
    exportFilenameBase: 'public-validator',
    tabs: [{
      id: 'typography',
      label: 'Typography',
      tiers: [{
        id: 'line-height-scale',
        label: 'Line heights',
        preview: 'line-height',
        items: [{
          id: 'body-line-height',
          cssVar: '--body-line-height',
          label: 'Body line height',
          default: '1.5',
          type: valid ? { kind: 'number', step: 0.1 } : { kind: 'length', step: 0.1, unit: 'rem' },
        }],
      }],
    }],
  };
}

// Build the package before running this test. A separate Node process bypasses
// Vitest's source alias and exercises the actual package exports map and dist.
describe.each(['@takazudo/zdtp', '@takazudo/zdtp/testing'])('%s public validator', (entrypoint) => {
  it('rejects the line-height/length repro and names the offending tier', () => {
    const output = execFileSync(process.execPath, ['--input-type=module', '--eval', `
      import assert from 'node:assert/strict';
      import { assertValidPanelConfig } from ${JSON.stringify(entrypoint)};
      assert.throws(
        () => assertValidPanelConfig(${JSON.stringify(config(false))}),
        /line-height-scale/,
      );
      console.log('validated');
    `], { cwd: packageRoot, encoding: 'utf8' });
    expect(output.trim()).toBe('validated');
  });

  it('accepts a valid line-height/number config', () => {
    const output = execFileSync(process.execPath, ['--input-type=module', '--eval', `
      import assert from 'node:assert/strict';
      import { assertValidPanelConfig } from ${JSON.stringify(entrypoint)};
      assert.doesNotThrow(() => assertValidPanelConfig(${JSON.stringify(config(true))}));
      console.log('validated');
    `], { cwd: packageRoot, encoding: 'utf8' });
    expect(output.trim()).toBe('validated');
  });
});
