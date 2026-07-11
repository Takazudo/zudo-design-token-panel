// @vitest-environment jsdom

/**
 * Unit tests for the TooltipProvider + useTooltip hook.
 *
 * Tests: show/hide on mouseenter/mouseleave, focusin/focusout, Escape key,
 * scroll-capture, and aria-hidden attribute toggling.
 *
 * Note: getBoundingClientRect() returns zeros in jsdom so we cannot assert
 * pixel positions.  Assertions target data-show and textContent instead.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { JSX } from 'preact';
import { TooltipProvider, useTooltip } from '../tooltip';

// ---------------------------------------------------------------------------
// Fixture component — a single trigger wired to useTooltip
// ---------------------------------------------------------------------------

function TriggerFixture({ label }: { label: string }): JSX.Element {
  const tooltipProps = useTooltip(label);
  return (
    <div
      data-testid="trigger"
      className="test-trigger"
      tabIndex={0}
      {...tooltipProps}
    >
      hover me
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  document.body.removeChild(container);
});

function renderFixture(label = '--test-token'): void {
  act(() => {
    render(
      <TooltipProvider>
        <TriggerFixture label={label} />
      </TooltipProvider>,
      container,
    );
  });
}

function getTooltip(): HTMLElement {
  return document.querySelector('.tokenpanel-tooltip') as HTMLElement;
}

function getTrigger(): HTMLElement {
  return document.querySelector('[data-testid="trigger"]') as HTMLElement;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TooltipProvider — tooltip element is in the DOM', () => {
  it('renders a .tokenpanel-tooltip element via portal', () => {
    renderFixture();
    expect(getTooltip()).not.toBeNull();
  });

  it('tooltip starts hidden (data-show=false)', () => {
    renderFixture();
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });

  it('tooltip starts with aria-hidden=true', () => {
    renderFixture();
    expect(getTooltip().getAttribute('aria-hidden')).toBe('true');
  });

  it('tooltip has role=tooltip', () => {
    renderFixture();
    expect(getTooltip().getAttribute('role')).toBe('tooltip');
  });
});

describe('useTooltip — mouseenter / mouseleave', () => {
  it('shows tooltip on mouseenter', () => {
    renderFixture('--my-token');
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(getTooltip().getAttribute('data-show')).toBe('true');
  });

  it('tooltip text matches label on mouseenter', () => {
    renderFixture('--my-token');
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(getTooltip().textContent).toBe('--my-token');
  });

  it('tooltip aria-hidden becomes false on mouseenter', () => {
    renderFixture('--my-token');
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(getTooltip().getAttribute('aria-hidden')).toBe('false');
  });

  it('hides tooltip on mouseleave', () => {
    renderFixture('--my-token');
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    });
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });
});

describe('useTooltip — focusin / focusout', () => {
  it('shows tooltip on focusin', () => {
    renderFixture('--focus-token');
    act(() => {
      getTrigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    expect(getTooltip().getAttribute('data-show')).toBe('true');
  });

  it('tooltip text matches label on focusin', () => {
    renderFixture('--focus-token');
    act(() => {
      getTrigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    expect(getTooltip().textContent).toBe('--focus-token');
  });

  it('hides tooltip on focusout', () => {
    renderFixture('--focus-token');
    act(() => {
      getTrigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    act(() => {
      getTrigger().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });
});

describe('useTooltip — Escape key', () => {
  it('hides tooltip on Escape', () => {
    renderFixture('--esc-token');
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });

  it('non-Escape keydown does not hide tooltip', () => {
    renderFixture('--esc-token');
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    // Should still be visible
    expect(getTooltip().getAttribute('data-show')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Resize hides the tooltip (issue #516)
// ---------------------------------------------------------------------------

describe('useTooltip — window resize hides tooltip', () => {
  it('hides tooltip on window resize while visible', () => {
    renderFixture('--resize-token');
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(getTooltip().getAttribute('data-show')).toBe('true');
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });

  it('window resize while no tooltip is visible does not throw', () => {
    renderFixture('--resize-token');
    expect(() => {
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }).not.toThrow();
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });
});

describe('useTooltip — panel-shell ResizeObserver hides tooltip', () => {
  // jsdom does not implement ResizeObserver (confirmed: `typeof ResizeObserver`
  // is `undefined` under jsdom), so the shell-resize path is exercised here
  // with a hand-rolled stand-in that records `observe`/`disconnect` calls and
  // lets a test fire the callback on demand. Real browser coverage lives in
  // the `.browser.test.tsx` grip-drag test.
  //
  // Per spec, a real ResizeObserver delivers one "initial" callback right
  // after observe() — even when nothing has actually resized — because it
  // has no prior size to diff the newly-observed target against. `observe()`
  // below fires that delivery synchronously so tests exercise the same
  // initial-callback shape tooltip.tsx's `primed` guard has to survive.
  class MockResizeObserver {
    static instances: MockResizeObserver[] = [];
    callback: ResizeObserverCallback;
    observed: Element[] = [];
    disconnectCount = 0;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      MockResizeObserver.instances.push(this);
    }

    observe(target: Element): void {
      this.observed.push(target);
      this.fire(); // simulate the spec-guaranteed initial delivery
    }

    unobserve(): void {}

    disconnect(): void {
      this.disconnectCount += 1;
    }

    /** Simulate the browser invoking the observer's callback. */
    fire(): void {
      this.callback([] as ResizeObserverEntry[], this as unknown as ResizeObserver);
    }
  }

  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    originalResizeObserver = (globalThis as { ResizeObserver?: typeof ResizeObserver })
      .ResizeObserver;
    MockResizeObserver.instances = [];
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = MockResizeObserver;
  });

  afterEach(() => {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = originalResizeObserver;
  });

  function renderShellFixture(label = '--shell-token'): void {
    act(() => {
      render(
        <TooltipProvider>
          <div className="tokenpanel-shell">
            <TriggerFixture label={label} />
          </div>
        </TooltipProvider>,
        container,
      );
    });
  }

  it('observes the tokenpanel-shell ancestor once the tooltip shows', () => {
    renderShellFixture();
    const shell = container.querySelector('.tokenpanel-shell') as HTMLElement;
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(MockResizeObserver.instances).toHaveLength(1);
    expect(MockResizeObserver.instances[0].observed).toEqual([shell]);
  });

  it('does NOT hide the tooltip on the ResizeObserver initial-observation delivery (no actual resize)', () => {
    renderShellFixture();
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    // observe() (invoked from the effect above) already synchronously fired
    // the spec-guaranteed initial delivery — a bare `hideAll()` on every
    // delivery would hide the tooltip right here, on every hover, with no
    // resize ever having happened. Assert it survived.
    expect(getTooltip().getAttribute('data-show')).toBe('true');
  });

  it('hides the tooltip on a genuine second delivery (an actual resize)', () => {
    renderShellFixture();
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(getTooltip().getAttribute('data-show')).toBe('true'); // survives the initial delivery
    act(() => {
      MockResizeObserver.instances[0].fire(); // a second, genuine delivery
    });
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });

  it('disconnects the observer once the tooltip hides (no leaked observer)', () => {
    renderShellFixture();
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    const observer = MockResizeObserver.instances[0];
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    });
    expect(observer.disconnectCount).toBe(1);
  });

  it('does not create a ResizeObserver while no trigger is hovered', () => {
    renderShellFixture();
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it('does not observe when the trigger has no .tokenpanel-shell ancestor', () => {
    renderFixture('--no-shell-token');
    act(() => {
      getTrigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(MockResizeObserver.instances).toHaveLength(0);
  });
});
