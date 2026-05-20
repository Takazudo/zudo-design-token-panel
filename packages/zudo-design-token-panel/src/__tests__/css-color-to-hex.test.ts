// @vitest-environment jsdom
/**
 * Regression tests for cssColorToHex covering two distinct browser quirks:
 *
 * 1. JSDOM no-op fillStyle — the canvas 2D context silently ignores fillStyle
 *    assignments and always returns '#000000'. We feature-detect this at
 *    module load and fall back to a manual rgb()/rgba() parser.
 *
 * 2. Modern-browser oklch round-trip — Chrome serializes a CSS Color 4 input
 *    (oklch/oklab/lab/lch/color()) back through the fillStyle *getter* in its
 *    own syntax (e.g. `oklch(0.65 0.2 45)`), not as hex. The old code read the
 *    getter string and collapsed every such color to '#000000'. cssColorToHex
 *    now samples the painted pixel via getImageData, so the getter format is
 *    irrelevant — see issue #221.
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

    it('converts rgba() string via manual parser — preserves alpha < 1 as 8-digit hex', async () => {
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('rgba(0, 255, 64, 0.5)')).toBe('#00ff4080');
    });

    it('returns #000000 for initial/inherit/empty', async () => {
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('initial')).toBe('#000000');
      expect(cssColorToHex('inherit')).toBe('#000000');
      expect(cssColorToHex('')).toBe('#000000');
    });
  });

  describe('working canvas with oklch round-trip (modern-browser simulation)', () => {
    // This mock reproduces modern Chrome: the fillStyle getter echoes the set
    // value verbatim (so for oklch it is deliberately NOT hex), while
    // getImageData returns the resolved sRGB bytes the browser would paint.
    // An unknown string models an invalid CSS color — the real setter ignores
    // it, leaving the previously-set value in place.

    // Resolved sRGB bytes per color, verified against Chromium 148.
    const RESOLVED: Record<string, [number, number, number, number]> = {
      '#000000': [0, 0, 0, 255],
      '#ffffff': [255, 255, 255, 255],
      'oklch(17% 0.005 50)': [17, 15, 13, 255],
      'oklch(65% 0.2 45)': [236, 90, 0, 255],
      'oklch(100% 0 0)': [255, 255, 255, 255],
      'oklch(65% 0.2 45 / 0.5)': [236, 90, 0, 128],
    };

    let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

    beforeEach(() => {
      originalGetContext = HTMLCanvasElement.prototype.getContext;
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function (this: HTMLCanvasElement, type: string, ...args: unknown[]): any {
          if (type !== '2d') {
            return (originalGetContext as (...a: unknown[]) => unknown).call(this, type, ...args);
          }
          let fillStyle = '#000000';
          const fakeCtx = {
            get fillStyle() {
              return fillStyle;
            },
            set fillStyle(v: string) {
              // Only known colors are "valid"; an unknown string is ignored,
              // mirroring the browser's silent rejection of invalid colors.
              if (v in RESOLVED) fillStyle = v;
            },
            clearRect() {},
            fillRect() {},
            getImageData() {
              const [r, g, b, a] = RESOLVED[fillStyle] ?? [0, 0, 0, 255];
              return { data: new Uint8ClampedArray([r, g, b, a]) };
            },
          };
          return fakeCtx as unknown as CanvasRenderingContext2D;
        } as typeof HTMLCanvasElement.prototype.getContext,
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('resolves an oklch() color to hex via pixel sampling', async () => {
      vi.resetModules();
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('oklch(17% 0.005 50)')).toBe('#110f0d');
      expect(cssColorToHex('oklch(65% 0.2 45)')).toBe('#ec5a00');
      expect(cssColorToHex('oklch(100% 0 0)')).toBe('#ffffff');
    });

    it('preserves alpha < 1 from an oklch() color as 8-digit hex', async () => {
      vi.resetModules();
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('oklch(65% 0.2 45 / 0.5)')).toBe('#ec5a0080');
    });

    it('returns #000000 for an unparseable color the setter ignores', async () => {
      vi.resetModules();
      const { cssColorToHex } = await import('../state/tweak-state');
      expect(cssColorToHex('definitely-not-a-color')).toBe('#000000');
    });

    it('does not depend on the fillStyle getter returning hex', async () => {
      // Proves the mock echoes a non-hex string back — the new code path
      // ignores the getter entirely and reads pixel data instead.
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.fillStyle = 'oklch(65% 0.2 45)';
      expect(ctx.fillStyle).toBe('oklch(65% 0.2 45)');
      expect(ctx.fillStyle.startsWith('#')).toBe(false);
    });
  });

  describe('JSDOM no-op fillStyle simulation', () => {
    let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

    beforeEach(() => {
      // Simulate the JSDOM behaviour where fillStyle is a no-op: any value
      // assigned to fillStyle stays as '#000000' (the default).
      originalGetContext = HTMLCanvasElement.prototype.getContext;
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function (this: HTMLCanvasElement, type: string, ...args: unknown[]): any {
          if (type !== '2d') {
            return (originalGetContext as (...a: unknown[]) => unknown).call(
              this,
              type,
              ...args,
            );
          }
          // Return a proxy whose fillStyle setter is a no-op.
          const ctx = originalGetContext.call(this, '2d') as CanvasRenderingContext2D | null;
          if (!ctx) return null;
          let _fillStyle = '#000000';
          return new Proxy(ctx, {
            get(target, prop) {
              if (prop === 'fillStyle') return _fillStyle;
              const value = (target as unknown as Record<string | symbol, unknown>)[prop];
              return typeof value === 'function' ? value.bind(target) : value;
            },
            set(_target, prop, value) {
              // Intentionally ignore fillStyle assignments (JSDOM behaviour).
              if (prop !== 'fillStyle') {
                (_target as unknown as Record<string | symbol, unknown>)[prop] = value;
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
