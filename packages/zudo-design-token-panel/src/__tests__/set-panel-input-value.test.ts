/**
 * Unit test for the `setPanelInputValue` Playwright helper exported from `./testing`.
 *
 * Two layers:
 *  1. Source-level — verifies `setPanelInputValue` is exported from `src/testing.ts`
 *     and has the correct signature (async function, accepts locator + value string).
 *  2. Behaviour — exercises the helper against a mock locator that records calls,
 *     confirming it calls `fill(value)` then `dispatchEvent('input')`.
 *
 * dist-level import is verified separately by the package-exports.test.ts pattern
 * (skipped when dist/ has not been built yet — CI builds before testing).
 *
 * Classification context (#264):
 *  This helper was introduced after diagnosing that `fill()` alone works correctly
 *  in headless Preact+Chromium — the panel's numeric text inputs DO commit on native
 *  `input` events dispatched by Playwright's `fill()`. The helper wraps `fill()` with
 *  a defensive second `dispatchEvent('input')` and provides accurate JSDoc that corrects
 *  the misattributed comment in the vite-react Wave 3 demo spec.
 */

import { describe, it, expect, vi } from 'vitest';
import { setPanelInputValue } from '../testing';

describe('setPanelInputValue — source-level smoke', () => {
  it('is exported as an async function from src/testing.ts', () => {
    expect(typeof setPanelInputValue).toBe('function');
    // Calling with a mock locator should return a Promise
    const mockLocator = {
      fill: vi.fn().mockResolvedValue(undefined),
      dispatchEvent: vi.fn().mockResolvedValue(undefined),
    };
    const result = setPanelInputValue(mockLocator, '15');
    expect(result).toBeInstanceOf(Promise);
    return result; // await to clean up
  });

  it('calls locator.fill(value) then locator.dispatchEvent("input")', async () => {
    const calls: string[] = [];
    const mockLocator = {
      fill: vi.fn().mockImplementation(async (v: string) => {
        calls.push(`fill(${v})`);
      }),
      dispatchEvent: vi.fn().mockImplementation(async (type: string) => {
        calls.push(`dispatchEvent(${type})`);
      }),
    };

    await setPanelInputValue(mockLocator, '1.5');

    // fill() must be called first with the value
    expect(mockLocator.fill).toHaveBeenCalledOnce();
    expect(mockLocator.fill).toHaveBeenCalledWith('1.5');

    // dispatchEvent('input') must be called after fill()
    expect(mockLocator.dispatchEvent).toHaveBeenCalledOnce();
    expect(mockLocator.dispatchEvent).toHaveBeenCalledWith('input');

    // Order: fill before dispatchEvent
    expect(calls).toEqual(['fill(1.5)', 'dispatchEvent(input)']);
  });

  it('does NOT dispatch "change" — Preact-compat maps onChange to native input event', async () => {
    const dispatchedTypes: string[] = [];
    const mockLocator = {
      fill: vi.fn().mockResolvedValue(undefined),
      dispatchEvent: vi.fn().mockImplementation(async (type: string) => {
        dispatchedTypes.push(type);
      }),
    };

    await setPanelInputValue(mockLocator, '40');

    // Must not dispatch 'change' — Preact-compat wires onChange to 'input', not 'change'
    expect(dispatchedTypes).not.toContain('change');
    expect(dispatchedTypes).toContain('input');
  });
});

describe('setPanelInputValue — dist-level smoke (skipped when dist not built)', () => {
  it('setPanelInputValue is a function in dist/testing.js', async () => {
    const { existsSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { pathToFileURL } = await import('node:url');

    const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
    const distTesting = `${packageRoot}/dist/testing.js`;

    if (!existsSync(`${packageRoot}/dist`)) {
      // Skip when dist/ has not been built yet — mirrors package-exports.test.ts.
      return;
    }

    expect(
      existsSync(distTesting),
      `${distTesting} must exist — run pnpm --filter @takazudo/zudo-design-token-panel build first`,
    ).toBe(true);

    const mod = (await import(pathToFileURL(distTesting).href)) as Record<string, unknown>;
    expect(
      typeof mod.setPanelInputValue,
      'dist/testing.js must export setPanelInputValue as a function',
    ).toBe('function');
  });
});
