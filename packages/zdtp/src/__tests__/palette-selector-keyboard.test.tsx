// @vitest-environment jsdom

/**
 * PaletteSelector listbox keyboard accessibility (#446 F12).
 *
 * The container owns keyboard navigation (project listbox policy): the
 * role="listbox" element is focusable and handles arrows / Home / End /
 * Enter / Space, tracking the active option via aria-activedescendant; the
 * role="option" children stay click-only and unfocusable. Escape closes and
 * returns focus to the trigger.
 *
 * Rendered through the real ColorTab so we exercise the actual wiring
 * (background base-role selector → persistColor).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import ColorTab from '../tabs/color-tab';
import {
  HighlightContext,
  type HighlightContextValue,
} from '../highlight/highlight-toggle-button';
import { DEFAULT_HIGHLIGHT_SLOTS, type HighlightState } from '../highlight/highlight-state';
import { TooltipProvider } from '../controls/tooltip';
import { __resetPanelConfigForTests } from '../config/panel-config';
import { installFixturePanelConfig, FIXTURE_TABS } from './_test-helpers';
import { __resetDismissLayersForTests } from '../controls/dismiss-layer';
import type { ColorTweakState } from '../state/tweak-state';
import type { PersistColor } from '../state/persist';
import type { TabConfig } from '../tokens/tier-model';

const COLOR_TAB = FIXTURE_TABS.find((t) => t.id === 'color') as TabConfig;

let container: HTMLDivElement;
let persistColor: ReturnType<typeof vi.fn>;

function makeHighlightState(): HighlightState {
  return {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    outlineWidth: 2,
    active: {},
  };
}

function makeColorState(): ColorTweakState {
  return {
    palette: Array.from({ length: 16 }, (_, i) => `#${i.toString(16).padStart(2, '0')}0000`),
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
    semanticMappings: { accent: 6, muted: 8, active: 14 },
    shikiTheme: 'dracula',
  };
}

function renderColorTab(): void {
  const ctx: HighlightContextValue = { state: makeHighlightState(), toggle: vi.fn() };
  act(() => {
    render(
      <TooltipProvider>
        <HighlightContext.Provider value={ctx}>
          <ColorTab
            tab={COLOR_TAB}
            state={makeColorState()}
            persistColor={persistColor as unknown as PersistColor}
            secondaryTab={null}
            secondaryState={null}
            persistSecondary={vi.fn()}
          />
        </HighlightContext.Provider>
      </TooltipProvider>,
      container,
    );
  });
}

beforeEach(() => {
  installFixturePanelConfig();
  container = document.createElement('div');
  document.body.appendChild(container);
  persistColor = vi.fn();
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  __resetPanelConfigForTests();
  __resetDismissLayersForTests();
});

/** The first palette selector is the "background (bg)" base-role row. */
function firstTrigger(): HTMLElement {
  const t = container.querySelector('.tokenpanel-palette-trigger') as HTMLElement;
  expect(t).not.toBeNull();
  return t;
}
function listbox(): HTMLElement | null {
  return container.querySelector('[role="listbox"]');
}
function key(el: Element, k: string): void {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });
}

describe('PaletteSelector — trigger opens the listbox', () => {
  it('Enter opens', () => {
    renderColorTab();
    expect(listbox()).toBeNull();
    key(firstTrigger(), 'Enter');
    expect(listbox()).not.toBeNull();
  });

  it('Space opens', () => {
    renderColorTab();
    key(firstTrigger(), ' ');
    expect(listbox()).not.toBeNull();
  });

  it('ArrowDown opens and moves focus into the listbox', () => {
    renderColorTab();
    key(firstTrigger(), 'ArrowDown');
    const lb = listbox();
    expect(lb).not.toBeNull();
    expect(lb!.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(lb);
  });
});

describe('PaletteSelector — container-owned option navigation', () => {
  it('seeds the active option to the current value on open', () => {
    renderColorTab();
    key(firstTrigger(), 'ArrowDown');
    const lb = listbox()!;
    // background value is 0 → active descendant is option p0.
    const active = lb.getAttribute('aria-activedescendant');
    expect(active).toMatch(/-opt-0$/);
    expect(container.querySelector(`#${active}`)).not.toBeNull();
  });

  it('arrows move the active option; Home/End jump to ends', () => {
    renderColorTab();
    key(firstTrigger(), 'ArrowDown');
    const lb = listbox()!;

    key(lb, 'ArrowDown');
    expect(lb.getAttribute('aria-activedescendant')).toMatch(/-opt-1$/);

    key(lb, 'ArrowDown');
    expect(lb.getAttribute('aria-activedescendant')).toMatch(/-opt-2$/);

    key(lb, 'ArrowUp');
    expect(lb.getAttribute('aria-activedescendant')).toMatch(/-opt-1$/);

    key(lb, 'End');
    expect(lb.getAttribute('aria-activedescendant')).toMatch(/-opt-15$/);

    key(lb, 'Home');
    expect(lb.getAttribute('aria-activedescendant')).toMatch(/-opt-0$/);
  });

  it('Enter selects the active option, closes, and returns focus to the trigger', () => {
    renderColorTab();
    const trigger = firstTrigger();
    key(trigger, 'ArrowDown');
    const lb = listbox()!;
    key(lb, 'ArrowDown'); // active → p1

    key(lb, 'Enter');

    // Selection committed as an index write for the "background" base role.
    expect(persistColor).toHaveBeenCalledOnce();
    const updater = persistColor.mock.calls[0][0] as (p: ColorTweakState) => ColorTweakState;
    expect(updater(makeColorState()).background).toBe(1);

    // Popover closed, focus restored.
    expect(listbox()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('Space selects the active option', () => {
    renderColorTab();
    key(firstTrigger(), 'ArrowDown');
    const lb = listbox()!;
    key(lb, 'End'); // active → p15
    key(lb, ' ');
    expect(persistColor).toHaveBeenCalledOnce();
    const updater = persistColor.mock.calls[0][0] as (p: ColorTweakState) => ColorTweakState;
    expect(updater(makeColorState()).background).toBe(15);
  });
});

describe('PaletteSelector — options honor the listbox policy', () => {
  it('options are role=option, unfocusable (no tabindex), with stable ids', () => {
    renderColorTab();
    key(firstTrigger(), 'ArrowDown');
    const options = listbox()!.querySelectorAll('[role="option"]');
    expect(options.length).toBe(16);
    for (const opt of Array.from(options)) {
      expect(opt.hasAttribute('tabindex')).toBe(false);
      expect(opt.id).not.toBe('');
    }
  });
});

describe('PaletteSelector — Escape', () => {
  it('closes the listbox and returns focus to the trigger', () => {
    renderColorTab();
    const trigger = firstTrigger();
    key(trigger, 'ArrowDown');
    expect(listbox()).not.toBeNull();

    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });

    expect(listbox()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    // No value change on Escape.
    expect(persistColor).not.toHaveBeenCalled();
  });
});
