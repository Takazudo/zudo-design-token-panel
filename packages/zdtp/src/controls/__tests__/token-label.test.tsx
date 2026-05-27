// @vitest-environment jsdom

/**
 * Unit tests for the TokenLabel component.
 *
 * Acceptance criteria:
 *  1. Renders cssVar text.
 *  2. Attaches useTooltip: mouseenter → .tokenpanel-tooltip shows the cssVar text.
 *  3. Renders sub-label only when label !== cssVar.
 *  4. Uses default className 'tokenpanel-row-label' when className omitted.
 *  5. Accepts a custom className override.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { TooltipProvider } from '../tooltip';
import TokenLabel from '../token-label';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  document.body.removeChild(container);
});

function renderLabel(
  cssVar: string,
  label?: string,
  className?: string,
): void {
  act(() => {
    render(
      <TooltipProvider>
        <TokenLabel cssVar={cssVar} label={label} className={className} />
      </TooltipProvider>,
      container,
    );
  });
}

function getTooltip(): HTMLElement {
  return document.querySelector('.tokenpanel-tooltip') as HTMLElement;
}

function getLabel(): HTMLElement {
  return container.querySelector('.tokenpanel-row-label') as HTMLElement;
}

// ---------------------------------------------------------------------------
// 1. Renders cssVar text
// ---------------------------------------------------------------------------

describe('TokenLabel — renders cssVar text', () => {
  it('renders the cssVar as visible text', () => {
    renderLabel('--my-token');
    expect(container.textContent).toContain('--my-token');
  });

  it('uses default class tokenpanel-row-label', () => {
    renderLabel('--my-token');
    const span = getLabel();
    expect(span).not.toBeNull();
    expect(span.className).toBe('tokenpanel-row-label');
  });

  it('accepts a custom className', () => {
    act(() => {
      render(
        <TooltipProvider>
          <TokenLabel cssVar="--my-token" className="custom-class" />
        </TooltipProvider>,
        container,
      );
    });
    const span = container.querySelector('.custom-class') as HTMLElement;
    expect(span).not.toBeNull();
    expect(span.textContent).toContain('--my-token');
  });
});

// ---------------------------------------------------------------------------
// 2. Tooltip via useTooltip — mouseenter shows the cssVar text
// ---------------------------------------------------------------------------

describe('TokenLabel — useTooltip integration', () => {
  it('tooltip element is present after render', () => {
    renderLabel('--test-tooltip');
    expect(getTooltip()).not.toBeNull();
  });

  it('tooltip starts hidden (data-show=false)', () => {
    renderLabel('--test-tooltip');
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });

  it('tooltip shows on mouseenter and contains cssVar text', () => {
    renderLabel('--test-tooltip');
    act(() => {
      getLabel().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    const tooltip = getTooltip();
    expect(tooltip.getAttribute('data-show')).toBe('true');
    expect(tooltip.textContent).toBe('--test-tooltip');
  });

  it('tooltip hides on mouseleave', () => {
    renderLabel('--test-tooltip');
    act(() => {
      getLabel().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    act(() => {
      getLabel().dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    });
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });

  it('no native title attribute on the span', () => {
    renderLabel('--test-tooltip');
    expect(getLabel().hasAttribute('title')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Sub-label rendered only when label !== cssVar
// ---------------------------------------------------------------------------

describe('TokenLabel — sub-label visibility', () => {
  it('renders sub-label when label differs from cssVar', () => {
    renderLabel('--my-token', 'My Token Label');
    const sub = container.querySelector('.tokenpanel-row-label-sub');
    expect(sub).not.toBeNull();
    expect(sub?.textContent).toBe('My Token Label');
  });

  it('does NOT render sub-label when label equals cssVar', () => {
    renderLabel('--my-token', '--my-token');
    const sub = container.querySelector('.tokenpanel-row-label-sub');
    expect(sub).toBeNull();
  });

  it('does NOT render sub-label when label is omitted', () => {
    renderLabel('--my-token');
    const sub = container.querySelector('.tokenpanel-row-label-sub');
    expect(sub).toBeNull();
  });

  it('does NOT render sub-label when label is empty string', () => {
    renderLabel('--my-token', '');
    const sub = container.querySelector('.tokenpanel-row-label-sub');
    expect(sub).toBeNull();
  });
});
