// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { ApplyModal } from '../apply-modal';
import { __resetPanelConfigForTests } from '../config/panel-config';
import type { TweakState } from '../state/tweak-state';
import { FIXTURE_CLUSTER, FIXTURE_TABS, installFixturePanelConfig } from './_test-helpers';

let container: HTMLDivElement;
const originalFetch = globalThis.fetch;
const defaults = {
  palette: Array.from({ length: FIXTURE_CLUSTER.paletteSize }, () => '#000000'),
  background: 0, foreground: 15, cursor: 6, selectionBg: 0, selectionFg: 15,
  semanticMappings: { accent: 6, muted: 8, active: 14 }, shikiTheme: 'dracula' as const,
};
const state = (value = '24px', unrouted = false): TweakState => ({ color: defaults, spacing: { 'hsp-md': value }, typography: {}, size: unrouted ? { 'radius-lg': '12px' } : {} });
const response = (body: object, status = 200) => ({
  ok: status >= 200 && status < 300, status, statusText: status === 200 ? 'OK' : 'Conflict',
  json: async () => body,
}) as Response;
const preview = (after = '  --zd-spacing-hgap-md: 24px;') => ({ ok: true, dryRun: true, files: [{
  file: 'src/tokens.css', blockKind: 'root', digest: 'a'.repeat(64), changed: ['--zd-spacing-hgap-md'],
  hunks: [{ cssVar: '--zd-spacing-hgap-md', line: 4, before: '  --zd-spacing-hgap-md: 16px;', after }],
}], rejected: ['--unrouted'], rejectedReasons: ['no route'] });

async function flush() { await act(async () => { vi.runAllTimers(); await Promise.resolve(); await Promise.resolve(); }); }
function mount(nextState = state()) {
  act(() => render(<ApplyModal state={nextState} colorDefaults={defaults} open onClose={() => undefined} onApplied={() => undefined} />, container));
}

beforeEach(() => {
  vi.useFakeTimers();
  installFixturePanelConfig({ applyEndpoint: '/apply', applyRouting: { zd: 'src/tokens.css' }, tabs: FIXTURE_TABS });
  container = document.createElement('div'); document.body.append(container);
});
afterEach(() => {
  act(() => render(null, container)); container.remove(); globalThis.fetch = originalFetch; vi.useRealTimers(); vi.restoreAllMocks(); __resetPanelConfigForTests();
});

describe('ApplyModal dry-run preview', () => {
  it('POSTs dryRun on open and renders hunks plus unrouted diagnostics', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(preview()));
    globalThis.fetch = fetchMock;
    mount(state('24px', true)); await flush();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ dryRun: true, tokens: { '--zd-spacing-hgap-md': '24px', '--radius-lg': '12px' } });
    expect(container.textContent).toContain('-   --zd-spacing-hgap-md: 16px;');
    expect(container.textContent).toContain('Copy as CSS');
  });

  it('ignores a stale preview response', async () => {
    let resolveFirst!: (value: Response) => void;
    const first = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const fetchMock = vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(response(preview('  --zd-spacing-hgap-md: 32px;')));
    globalThis.fetch = fetchMock;
    mount(); await act(async () => { vi.runAllTimers(); });
    mount(state('32px')); await flush();
    resolveFirst(response(preview('  --zd-spacing-hgap-md: stale;'))); await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(container.textContent).toContain('+   --zd-spacing-hgap-md: 32px;');
    expect(container.textContent).not.toContain('stale');
  });

  it('invalidates an in-flight response when selection becomes empty', async () => {
    let resolvePreview!: (value: Response) => void;
    globalThis.fetch = vi.fn().mockReturnValue(new Promise<Response>((resolve) => { resolvePreview = resolve; }));
    mount();
    const include = container.querySelector<HTMLInputElement>('input[aria-label^="Include"]')!;
    act(() => { include.checked = false; include.dispatchEvent(new Event('change', { bubbles: true })); });
    resolvePreview(response(preview('  --zd-spacing-hgap-md: stale;')));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(container.textContent).not.toContain('stale');
    expect(container.textContent).toContain('Write 0 files (0 tokens)');
  });

  it('refreshes the dry-run with a notice after a stale-file 409', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(preview()))
      .mockResolvedValueOnce(response({ ok: false, reason: 'stale-file', files: ['src/tokens.css'] }, 409))
      .mockResolvedValueOnce(response(preview('  --zd-spacing-hgap-md: 25px;')));
    globalThis.fetch = fetchMock;
    mount(); await flush();
    const write = Array.from(container.querySelectorAll<HTMLElement>('[role="button"]')).find((node) => node.textContent?.startsWith('Write'))!;
    await act(async () => { write.click(); await Promise.resolve(); await Promise.resolve(); });
    await flush();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ expectDigests: { 'src/tokens.css': 'a'.repeat(64) } });
    expect(container.textContent).toContain('Files changed on disk');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
