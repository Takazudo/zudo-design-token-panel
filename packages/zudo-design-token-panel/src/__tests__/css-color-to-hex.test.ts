// @vitest-environment jsdom
/**
 * Regression tests for cssColorToHex — specifically the JSDOM no-op fillStyle
 * case where the canvas 2D context silently ignores fillStyle assignments and
 * always returns '#000000'.
 *
 * Finding 6: module-level cached canvas 2D context was broken in JSDOM because
 * the fillStyle setter is a no-op. We now feature-detect this at module load
 * and fall back to a manual rgb()/rgba() parser when the canvas is unreliable.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('cssColorToHex', () => {
  // We must re-import the module fresh for each test group because the
  // _canvasAvailable flag is computed at module-load time.  Use a dynamic
  // import inside each test so we can stub the environment first.

  describe('with a working canvas (real browser simulation)', () => {
    it('passes through a 6-digit hex unchanged', async () => {
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('#1a2b3c')).toBe('#1a2b3c');
    });

    it('expands a 3-digit hex to 6 digits', async () => {
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('#abc')).toBe('#aabbcc');
    });

    it('converts rgb() string via manual parser', async () => {
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('rgb(255, 0, 128)')).toBe('#ff0080');
    });

    it('converts rgba() string via manual parser (ignores alpha)', async () => {
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('rgba(0, 255, 64, 0.5)')).toBe('#00ff40');
    });

    it('returns #000000 for initial/inherit/empty', async () => {
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('initial')).toBe('#000000');
      expect(cssColorToHex('inherit')).toBe('#000000');
      expect(cssColorToHex('')).toBe('#000000');
    });
  });

  describe('JSDOM no-op fillStyle simulation', () => {
    let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

    beforeEach(() => {
      // Simulate the JSDOM behaviour where fillStyle is a no-op: any value
      // assigned to fillStyle stays as '#000000' (the default).
      originalGetContext = HTMLCanvasElement.prototype.getContext;
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        function (type: string, ...args: unknown[]) {
          if (type !== '2d') {
            return originalGetContext.call(this, type as '2d', ...(args as []));
          }
          // Return a proxy whose fillStyle setter is a no-op.
          const ctx = originalGetContext.call(this, '2d') as CanvasRenderingContext2D | null;
          if (!ctx) return null;
          let _fillStyle = '#000000';
          return new Proxy(ctx, {
            get(target, prop) {
              if (prop === 'fillStyle') return _fillStyle;
              const value = (target as Record<string | symbol, unknown>)[prop];
              return typeof value === 'function' ? value.bind(target) : value;
            },
            set(_target, prop, value) {
              // Intentionally ignore fillStyle assignments (JSDOM behaviour).
              if (prop !== 'fillStyle') {
                (_target as Record<string | symbol, unknown>)[prop] = value;
              }
              return true;
            },
          });
        } as typeof HTMLCanvasElement.prototype.getContext,
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does not return #000000 for rgb() when fillStyle is a no-op', async () => {
      // Re-import so the module re-evaluates _canvasAvailable with our stub.
      vi.resetModules();
      const { cssColorToHex } = await import('../state/tweak-state');
      // The manual rgb() parser must handle this before the canvas is tried.
      expect(cssColorToHex('rgb(255, 128, 0)')).toBe('#ff8000');
    });

    it('does not return #000000 for rgba() when fillStyle is a no-op', async () => {
      vi.resetModules();
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('rgba(64, 128, 192, 1)')).toBe('#4080c0');
    });

    it('still passes through a 6-digit hex correctly', async () => {
      vi.resetModules();
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('#deadbe')).toBe('#deadbe');
    });
  });
});
