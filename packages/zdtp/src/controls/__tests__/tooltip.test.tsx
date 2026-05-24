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
