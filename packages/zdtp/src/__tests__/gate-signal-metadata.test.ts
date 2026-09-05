// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PanelConfig } from '../config/panel-config';
import { EAGER_LOAD_GATE_KEY_SUFFIXES, EAGER_LOAD_GATE_STATE_FAMILY } from '../constants';

// Observe the real adapter's import decision without mounting the panel.
const { panelConfigProbe } = vi.hoisted(() => ({ panelConfigProbe: vi.fn() }));
vi.mock('@takazudo/zdtp', () => ({ __panelConfigForTest: panelConfigProbe }));

const CFG: PanelConfig = {
  storagePrefix: 'gate-test',
  consoleNamespace: 'gateTest',
  modalClassPrefix: 'gate-modal',
  schemaId: 'gate/v1',
  exportFilenameBase: 'gate-tokens',
  tabs: [],
  colorPresets: {},
  domTweaker: {},
};

/** A consumer interpreting only the exported metadata, independently of the adapter. */
function predictsActivation(cfg: PanelConfig): boolean {
  for (const [suffix, signal] of Object.entries(EAGER_LOAD_GATE_KEY_SUFFIXES)) {
    if (signal.requiredConfig !== null && cfg[signal.requiredConfig] === undefined) continue;
    const value = localStorage.getItem(cfg.storagePrefix + suffix);
    if (signal.acceptedValues.some((accepted) => accepted === value)) return true;
  }
  const { matchesKey, valueRules } = EAGER_LOAD_GATE_STATE_FAMILY;
  return Object.keys(localStorage).some((key) => {
    if (!matchesKey(cfg.storagePrefix, key)) return false;
    const raw = localStorage.getItem(key);
    if (raw === null || raw === '') return valueRules.blank;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return valueRules.malformedJson;
    }
    if (parsed === null) return valueRules.jsonNull;
    if (Array.isArray(parsed)) return valueRules.array === 'non-empty' && parsed.length > 0;
    if (typeof parsed === 'object') {
      return valueRules.object === 'non-empty' && Object.keys(parsed).length > 0;
    }
    return valueRules.primitive;
  });
}

async function assertGate(expected: boolean, cfg = CFG): Promise<void> {
  expect(predictsActivation(cfg)).toBe(expected);
  const script = document.createElement('script');
  script.id = 'tokenpanel-config';
  script.type = 'application/json';
  script.textContent = JSON.stringify(cfg);
  document.head.appendChild(script);
  vi.resetModules();
  const { __resetPanelConfigForTests, getPanelConfig } = await import('../config/panel-config');
  __resetPanelConfigForTests();
  // Keep the lazy module's singleton probe honest without importing the panel UI.
  panelConfigProbe.mockImplementation(getPanelConfig);
  await import('../astro/host-adapter');
  const states = (window as unknown as {
    __zudoDesignTokenPanelAdapter: Record<string, { modulePromise: Promise<unknown> | null }>;
  }).__zudoDesignTokenPanelAdapter;
  const promise = states[cfg.storagePrefix].modulePromise;
  expect(promise !== null).toBe(expected);
  await promise;
}

function cleanup(): void {
  localStorage.clear();
  document.head.innerHTML = '';
  const win = window as unknown as Record<string, unknown>;
  delete win.__zudoDesignTokenPanelAdapter;
  delete win[CFG.consoleNamespace];
  delete win.zdtp;
}
beforeEach(cleanup);
afterEach(cleanup);

describe('exported eager-load signals predict the actual host-adapter gate', () => {
  it('leaves an empty store dormant', async () => {
    await assertGate(false);
  });

  // Deliberately seed the independent contract cases, not cases generated from
  // metadata: deleting a signal from the export must make this guard fail.
  for (const suffix of [':visible', '-open', ':autoload', '-elpath-enabled', '-domtweaker-enabled']) {
    it.each(['1', 'auto', '0', '', 'true'])(`${suffix} alone with %j`, async (value) => {
      localStorage.setItem(CFG.storagePrefix + suffix, value);
      await assertGate(value === '1' || (suffix === ':autoload' && value === 'auto'));
    });
    it(`${suffix} from a sibling does not activate`, async () => {
      localStorage.setItem(CFG.storagePrefix + '-sibling' + suffix, '1');
      await assertGate(false);
    });
  }

  it('ignores DOM Tweaker when the config omits it', async () => {
    localStorage.setItem(CFG.storagePrefix + '-domtweaker-enabled', '1');
    await assertGate(false, { ...CFG, domTweaker: undefined });
  });

  for (const suffix of ['-state', '-state-v2', '-state-v3', '-state-v9']) {
    it.each([
      ['{}', false], ['[]', false], ['null', false], ['', false],
      ['{"x":1}', true], ['[0]', true], ['{broken', true],
      ['false', true], ['0', true], ['""', true],
    ] as const)(`${suffix} envelope %j`, async (raw, expected) => {
      localStorage.setItem(CFG.storagePrefix + suffix, raw);
      await assertGate(expected);
    });
  }

  it('scans beyond an empty older envelope to an active future version', async () => {
    localStorage.setItem(CFG.storagePrefix + '-state', '{}');
    localStorage.setItem(CFG.storagePrefix + '-state-v9', '{"x":1}');
    await assertGate(true);
  });

  it.each(['-state-state', '-state-state-v9', '-state-v', '-state-v9-extra', '-state-vx', '-stateful'])(
    'excludes sibling or non-family suffix %s', async (suffix) => {
      localStorage.setItem(CFG.storagePrefix + suffix, '{"x":1}');
      await assertGate(false);
    },
  );

  it('matches a prefix containing regex metacharacters literally', async () => {
    const cfg = { ...CFG, storagePrefix: 'gate.[x]+(a)?^$|{}\\' };
    localStorage.setItem(cfg.storagePrefix + '-state-v9', '{"x":1}');
    await assertGate(true, cfg);
  });

  it('does not treat regex prefix punctuation as wildcards', async () => {
    localStorage.setItem('gateXtest-state-v9', '{"x":1}');
    await assertGate(false, { ...CFG, storagePrefix: 'gate.test' });
  });

  it.each([
    '-dock', '-dock-size', '-ghost', '-specimen', '-on-page-specimen',
    '-snapshot-a', '-snapshot-b', '-last-applied',
  ])('preference %s alone does not activate', async (suffix) => {
    localStorage.setItem(CFG.storagePrefix + suffix, '1');
    await assertGate(false);
  });
});
