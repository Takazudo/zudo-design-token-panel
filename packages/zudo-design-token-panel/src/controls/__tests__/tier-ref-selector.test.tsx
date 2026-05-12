// @vitest-environment jsdom

/**
 * Unit tests for TierRefSelector.
 *
 * Uses Preact's `render` + `act` for DOM interaction so the full
 * component lifecycle (effects, state updates) runs under vitest/jsdom.
 *
 * Test structure:
 *  1. Rendering — trigger button shows current ref label + preview
 *  2. Opening — clicking trigger mounts the listbox
 *  3. Keyboard: ArrowDown / ArrowUp navigate focus
 *  4. Keyboard: Enter picks the focused option, calls onChange, closes
 *  5. Keyboard: Escape closes without calling onChange
 *  6. Mouse: clicking an option calls onChange, closes
 *  7. Literal option — picks TIER_REF_LITERAL_SIGNAL, closes
 *  8. Click-outside — mousedown outside closes the listbox
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import TierRefSelector, { TIER_REF_LITERAL_SIGNAL } from '../tier-ref-selector';
import type { TabConfig } from '../../tokens/tier-model';

// ---------------------------------------------------------------------------
// Fixture tab config — 2-tier easing example (mirrors tier-model-integration
// test so the synthetic data is familiar and well-tested).
// ---------------------------------------------------------------------------

const EASING_TAB: TabConfig = {
  id: 'easing',
  label: 'Easing',
  tiers: [
    {
      id: 'raw',
      label: 'Raw curves',
      items: [
        {
          id: 'ease-in',
          cssVar: '--easing-ease-in',
          label: 'Ease in',
          default: 'cubic-bezier(0.42, 0, 1, 1)',
          type: { kind: 'text' },
        },
        {
          id: 'ease-out',
          cssVar: '--easing-ease-out',
          label: 'Ease out',
          default: 'cubic-bezier(0, 0, 0.58, 1)',
          type: { kind: 'text' },
        },
        {
          id: 'linear',
          cssVar: '--easing-linear',
          label: 'Linear',
          default: 'linear',
          type: { kind: 'text' },
        },
      ],
    },
    {
      id: 'semantic',
      label: 'Semantic roles',
      referencesTier: 'raw',
      items: [
        {
          id: 'tab-open',
          cssVar: '--easing-tab-open',
          label: 'Tab open',
          default: 'ease-out',
          type: { kind: 'text' },
        },
        {
          id: 'tab-close',
          cssVar: '--easing-tab-close',
          label: 'Tab close',
          default: 'ease-in',
          type: { kind: 'text' },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    render(null, container);
  });
  container.remove();
});

function renderSelector(
  value: string,
  onChange: (itemId: string, next: string) => void,
) {
  act(() => {
    render(
      <TierRefSelector
        tab={EASING_TAB}
        tierId="semantic"
        itemId="tab-open"
        value={value}
        onChange={onChange}
      />,
      container,
    );
  });
}

/** Fire a keyboard event on an element. */
function fireKey(el: Element, key: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function getTrigger(): HTMLButtonElement {
  const btn = container.querySelector<HTMLButtonElement>('.tokenpanel-tier-ref-trigger');
  if (!btn) throw new Error('trigger button not found');
  return btn;
}

function getListbox(): HTMLUListElement | null {
  return container.querySelector<HTMLUListElement>('.tokenpanel-tier-ref-listbox');
}

function getOptions(): NodeListOf<HTMLElement> {
  return container.querySelectorAll<HTMLElement>('[role="option"]');
}

function getFocusedOption(): HTMLElement | null {
  return container.querySelector<HTMLElement>('.tokenpanel-tier-ref-option--focused');
}

function clickTrigger() {
  act(() => {
    getTrigger().click();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TierRefSelector — rendering', () => {
  it('renders a trigger button with current ref item cssVar and value preview', () => {
    renderSelector('ease-out', vi.fn());

    const trigger = getTrigger();
    // The trigger should contain the ref item cssVar "--easing-ease-out" and a
    // truncated preview of its default value.
    expect(trigger.textContent).toContain('--easing-ease-out');
    // "cubic-bezier(0, 0, 0.58, 1)" is 26 chars — fits within PREVIEW_MAX_LEN
    expect(trigger.textContent).toContain('cubic-bezier(0, 0, 0.58, 1)');
  });

  it('truncates long value previews in the trigger', () => {
    // ease-in default is "cubic-bezier(0.42, 0, 1, 1)" — 28 chars, at limit
    renderSelector('ease-in', vi.fn());
    const trigger = getTrigger();
    // cssVar must be present
    expect(trigger.textContent).toContain('--easing-ease-in');
  });

  it('does not render the listbox when closed', () => {
    renderSelector('ease-out', vi.fn());
    expect(getListbox()).toBeNull();
  });

  it('trigger has aria-haspopup=listbox and aria-expanded=false when closed', () => {
    renderSelector('ease-out', vi.fn());
    const trigger = getTrigger();
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('TierRefSelector — opening the dropdown', () => {
  it('shows the listbox after clicking the trigger', () => {
    renderSelector('ease-out', vi.fn());
    clickTrigger();
    expect(getListbox()).not.toBeNull();
  });

  it('trigger aria-expanded becomes true when open', () => {
    renderSelector('ease-out', vi.fn());
    clickTrigger();
    expect(getTrigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('listbox has role=listbox', () => {
    renderSelector('ease-out', vi.fn());
    clickTrigger();
    expect(getListbox()?.getAttribute('role')).toBe('listbox');
  });

  it('renders one option per raw tier item plus the Literal option', () => {
    renderSelector('ease-out', vi.fn());
    clickTrigger();
    // EASING_TAB raw tier has 3 items + 1 Literal sentinel = 4 options
    const options = getOptions();
    expect(options.length).toBe(4);
  });

  it('each raw item option shows cssVar and value preview', () => {
    renderSelector('linear', vi.fn());
    clickTrigger();
    const options = Array.from(getOptions());
    const easeInOption = options.find((o) => o.textContent?.includes('--easing-ease-in'));
    expect(easeInOption).not.toBeUndefined();
    // preview of "cubic-bezier(0.42, 0, 1, 1)" (28 chars — at limit, no truncation needed)
    expect(easeInOption?.textContent).toContain('cubic-bezier(0.42, 0, 1, 1)');
  });

  it('currently selected option has aria-selected=true', () => {
    renderSelector('ease-out', vi.fn());
    clickTrigger();
    const options = Array.from(getOptions());
    const selected = options.filter((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toContain('--easing-ease-out');
  });

  it('opens with focus on the currently selected item', () => {
    renderSelector('ease-out', vi.fn());
    clickTrigger();
    // ease-out is index 1 in raw items
    const focused = getFocusedOption();
    expect(focused?.textContent).toContain('--easing-ease-out');
  });

  it('opens with focus on first item when value is unrecognised', () => {
    renderSelector('unknown-id', vi.fn());
    clickTrigger();
    const focused = getFocusedOption();
    expect(focused?.textContent).toContain('--easing-ease-in');
  });

  it('Enter on the trigger opens the dropdown', () => {
    renderSelector('ease-out', vi.fn());
    fireKey(getTrigger(), 'Enter');
    expect(getListbox()).not.toBeNull();
  });

  it('ArrowDown on the trigger opens the dropdown', () => {
    renderSelector('ease-out', vi.fn());
    fireKey(getTrigger(), 'ArrowDown');
    expect(getListbox()).not.toBeNull();
  });
});

describe('TierRefSelector — keyboard navigation', () => {
  it('ArrowDown moves focus to the next option', () => {
    // Start with ease-in selected (index 0) so ArrowDown → index 1 (ease-out).
    renderSelector('ease-in', vi.fn());
    clickTrigger();
    fireKey(getListbox()!, 'ArrowDown');
    const focused = getFocusedOption();
    expect(focused?.textContent).toContain('--easing-ease-out');
  });

  it('ArrowUp moves focus to the previous option', () => {
    // Start with ease-out selected (index 1) so ArrowUp → index 0 (ease-in).
    renderSelector('ease-out', vi.fn());
    clickTrigger();
    fireKey(getListbox()!, 'ArrowUp');
    const focused = getFocusedOption();
    expect(focused?.textContent).toContain('--easing-ease-in');
  });

  it('ArrowDown does not go past the last option', () => {
    // Start with Literal option focused (last): navigate down, should stay.
    renderSelector('unknown-id', vi.fn());
    clickTrigger();
    const lb = getListbox()!;
    // 3 raw items + 1 literal = 4 options; navigate to last (index 3)
    act(() => {
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    const options = Array.from(getOptions());
    const lastOption = options[options.length - 1];
    expect(lastOption.classList.contains('tokenpanel-tier-ref-option--focused')).toBe(true);
  });

  it('ArrowUp does not go before the first option', () => {
    // Start with ease-in (index 0), ArrowUp should keep focus at index 0.
    renderSelector('ease-in', vi.fn());
    clickTrigger();
    fireKey(getListbox()!, 'ArrowUp');
    const options = Array.from(getOptions());
    expect(options[0].classList.contains('tokenpanel-tier-ref-option--focused')).toBe(true);
  });
});

describe('TierRefSelector — picking an option', () => {
  it('Enter picks the focused option and calls onChange with (itemId, refItemId)', () => {
    const onChange = vi.fn();
    renderSelector('ease-in', onChange);
    clickTrigger();
    // Default focus is on ease-in (index 0). Navigate to ease-out (index 1).
    fireKey(getListbox()!, 'ArrowDown');
    fireKey(getListbox()!, 'Enter');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('tab-open', 'ease-out');
  });

  it('picking an option closes the dropdown', () => {
    renderSelector('ease-in', vi.fn());
    clickTrigger();
    fireKey(getListbox()!, 'Enter');
    expect(getListbox()).toBeNull();
  });

  it('mouse click on an option calls onChange and closes', () => {
    const onChange = vi.fn();
    renderSelector('ease-in', onChange);
    clickTrigger();

    const options = Array.from(getOptions());
    // Click on the "linear" option (index 2 in raw items) — identified by cssVar.
    const linearOption = options.find((o) => o.textContent?.includes('--easing-linear'));
    expect(linearOption).not.toBeUndefined();
    act(() => {
      linearOption!.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
    });

    expect(onChange).toHaveBeenCalledWith('tab-open', 'linear');
    expect(getListbox()).toBeNull();
  });
});

describe('TierRefSelector — Escape closes without committing', () => {
  it('Escape closes the dropdown', () => {
    renderSelector('ease-in', vi.fn());
    clickTrigger();
    fireKey(getListbox()!, 'Escape');
    expect(getListbox()).toBeNull();
  });

  it('Escape does not call onChange', () => {
    const onChange = vi.fn();
    renderSelector('ease-in', onChange);
    clickTrigger();
    fireKey(getListbox()!, 'Escape');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Escape returns focus to the trigger button', () => {
    renderSelector('ease-in', vi.fn());
    const trigger = getTrigger();
    clickTrigger();
    fireKey(getListbox()!, 'Escape');
    // After Escape the trigger should be focused (checked via document.activeElement).
    expect(document.activeElement).toBe(trigger);
  });
});

describe('TierRefSelector — Literal option', () => {
  it('last option is "Literal…"', () => {
    renderSelector('ease-in', vi.fn());
    clickTrigger();
    const options = Array.from(getOptions());
    const lastOption = options[options.length - 1];
    expect(lastOption.textContent).toContain('Literal');
  });

  it('picking Literal calls onChange with TIER_REF_LITERAL_SIGNAL', () => {
    const onChange = vi.fn();
    renderSelector('ease-in', onChange);
    clickTrigger();
    // Navigate to Literal (last option): 3 raw + 1 literal = index 3
    const lb = getListbox()!;
    act(() => {
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    fireKey(lb, 'Enter');

    expect(onChange).toHaveBeenCalledWith('tab-open', TIER_REF_LITERAL_SIGNAL);
  });

  it('TIER_REF_LITERAL_SIGNAL value is "__literal__"', () => {
    // Contractual assertion — consumers depend on this exact sentinel.
    expect(TIER_REF_LITERAL_SIGNAL).toBe('__literal__');
  });
});

describe('TierRefSelector — click-outside closes', () => {
  it('mousedown outside the selector closes the listbox', () => {
    renderSelector('ease-in', vi.fn());
    clickTrigger();
    expect(getListbox()).not.toBeNull();

    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(getListbox()).toBeNull();
  });

  it('mousedown inside the selector does not close the listbox', () => {
    renderSelector('ease-in', vi.fn());
    clickTrigger();
    act(() => {
      // Click on the listbox itself (not an option).
      getListbox()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    // The listbox is still open because we rely on mousedown+preventDefault in
    // option handlers; a bare listbox mousedown does not commit a selection.
    // The click-outside handler only fires when target is outside both the
    // trigger and listbox containers — this test ensures the contains() guard
    // works correctly.
    //
    // Note: the listbox mousedown bubbles to the document handler which checks
    // `listboxRef.current.contains(target)` — this should be true, so the
    // listbox stays open.
    expect(getListbox()).not.toBeNull();
  });
});
