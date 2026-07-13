// @vitest-environment jsdom

/**
 * Unit tests for HelpIcon (issues #520 and #544) — the "?" badge used for
 * section-level semantic-token help in the Color tab.
 *
 * Test structure:
 *  1. Chrome-button policy — div[role=button], no native <button>.
 *  2. Hover/focus shows the help-variant tooltip transiently.
 *  3. Click / Enter / Space pins the tooltip open; a second activation or
 *     Escape unpins it.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { HelpIcon } from '../help-icon';
import { TooltipProvider } from '../tooltip';

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
  container.remove();
});

function renderIcon(text = 'Wrapped explainer text.', ariaLabel = 'Literal help'): void {
  act(() => {
    render(
      <TooltipProvider>
        <HelpIcon text={text} ariaLabel={ariaLabel} />
      </TooltipProvider>,
      container,
    );
  });
}

function getIcon(): HTMLElement {
  return container.querySelector('.tokenpanel-help-icon') as HTMLElement;
}

function getTooltip(): HTMLElement {
  return document.querySelector('.tokenpanel-tooltip') as HTMLElement;
}

function fireMouseEnter(): void {
  act(() => {
    getIcon().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  });
}

function fireMouseLeave(): void {
  act(() => {
    getIcon().dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  });
}

function fireFocusIn(): void {
  act(() => {
    getIcon().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  });
}

function fireFocusOut(): void {
  act(() => {
    getIcon().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
}

function fireClick(): void {
  act(() => {
    getIcon().click();
  });
}

function fireKeyDown(key: string): void {
  act(() => {
    getIcon().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

function fireEscapeOnDocument(): void {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
}

// ---------------------------------------------------------------------------
// 1. Chrome-button policy
// ---------------------------------------------------------------------------

describe('HelpIcon — chrome-button policy', () => {
  it('renders a div[role=button] with tabIndex 0, never a native <button>', () => {
    renderIcon();
    const icon = getIcon();
    expect(icon.tagName.toLowerCase()).toBe('div');
    expect(icon.getAttribute('role')).toBe('button');
    expect(icon.tabIndex).toBe(0);
    expect(container.querySelector('button')).toBeNull();
  });

  it('carries the given aria-label', () => {
    renderIcon('text', 'Surface per-mode help');
    expect(getIcon().getAttribute('aria-label')).toBe('Surface per-mode help');
  });

  it('renders the "?" glyph', () => {
    renderIcon();
    expect(getIcon().textContent).toBe('?');
  });
});

// ---------------------------------------------------------------------------
// 2. Hover/focus — transient tooltip
// ---------------------------------------------------------------------------

describe('HelpIcon — hover/focus shows the help-variant tooltip', () => {
  it('shows the tooltip with the help-variant class and exact text on mouseenter', () => {
    renderIcon('Wrapped explainer text.');
    fireMouseEnter();
    const tip = getTooltip();
    expect(tip.getAttribute('data-show')).toBe('true');
    expect(tip.className).toContain('tokenpanel-tooltip--help');
    expect(tip.textContent).toBe('Wrapped explainer text.');
  });

  it('hides the tooltip on mouseleave when not pinned', () => {
    renderIcon();
    fireMouseEnter();
    fireMouseLeave();
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });

  it('shows the tooltip on focusin and hides it on focusout when not pinned', () => {
    renderIcon();
    fireFocusIn();
    expect(getTooltip().getAttribute('data-show')).toBe('true');
    fireFocusOut();
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// 3. Click / Enter / Space pin; second activation or Escape unpins
// ---------------------------------------------------------------------------

describe('HelpIcon — click/Enter/Space pins the tooltip, second activation or Escape unpins', () => {
  it('click pins the tooltip open and sets aria-pressed=true', () => {
    renderIcon();
    fireClick();
    expect(getTooltip().getAttribute('data-show')).toBe('true');
    expect(getIcon().getAttribute('aria-pressed')).toBe('true');
  });

  it('mouseleave does NOT hide the tooltip while pinned', () => {
    renderIcon();
    fireMouseEnter();
    fireClick();
    fireMouseLeave();
    expect(getTooltip().getAttribute('data-show')).toBe('true');
  });

  it('focusout does NOT hide the tooltip while pinned', () => {
    renderIcon();
    fireFocusIn();
    fireClick();
    fireFocusOut();
    expect(getTooltip().getAttribute('data-show')).toBe('true');
  });

  it('a second click unpins and hides the tooltip', () => {
    renderIcon();
    fireClick();
    fireClick();
    expect(getTooltip().getAttribute('data-show')).toBe('false');
    expect(getIcon().getAttribute('aria-pressed')).toBe('false');
  });

  it('Enter key pins the tooltip like a click', () => {
    renderIcon();
    fireKeyDown('Enter');
    expect(getTooltip().getAttribute('data-show')).toBe('true');
    expect(getIcon().getAttribute('aria-pressed')).toBe('true');
  });

  it('Space key pins the tooltip like a click', () => {
    renderIcon();
    fireKeyDown(' ');
    expect(getTooltip().getAttribute('data-show')).toBe('true');
  });

  it('Escape unpins a pinned tooltip and resets aria-pressed', () => {
    renderIcon();
    fireClick();
    expect(getTooltip().getAttribute('data-show')).toBe('true');
    fireEscapeOnDocument();
    expect(getTooltip().getAttribute('data-show')).toBe('false');
    expect(getIcon().getAttribute('aria-pressed')).toBe('false');
  });

  it('Escape while NOT pinned does not throw and leaves the tooltip hidden', () => {
    renderIcon();
    expect(() => fireEscapeOnDocument()).not.toThrow();
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });
});
