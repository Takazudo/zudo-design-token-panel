// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_HIGHLIGHT_SLOTS,
  allocateSlot,
  toggleHighlight,
  resetSlots,
  clearAllActive,
  setSlot,
  loadHighlightState,
  saveHighlightState,
  type HighlightState,
} from '../highlight-state';
import {
  __resetPanelConfigForTests,
  getPanelConfig,
} from '../../config/panel-config';
import { installFixturePanelConfig } from '../../__tests__/_test-helpers';

// ---------------------------------------------------------------------------
// Shared setup / teardown
// ---------------------------------------------------------------------------

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  installFixturePanelConfig();
  localStorage.clear();
  sessionStorage.clear();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  __resetPanelConfigForTests();
  localStorage.clear();
  sessionStorage.clear();
  warnSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// DEFAULT_HIGHLIGHT_SLOTS
// ---------------------------------------------------------------------------

describe('DEFAULT_HIGHLIGHT_SLOTS', () => {
  it('exports exactly 10 slots', () => {
    expect(DEFAULT_HIGHLIGHT_SLOTS).toHaveLength(10);
  });

  it('all slots have outlineWidth 2', () => {
    for (const slot of DEFAULT_HIGHLIGHT_SLOTS) {
      expect(slot.outlineWidth).toBe(2);
    }
  });

  it('first slot is red #ff2d2d', () => {
    expect(DEFAULT_HIGHLIGHT_SLOTS[0].color).toBe('#ff2d2d');
  });

  it('last slot is blue #2d6eff', () => {
    expect(DEFAULT_HIGHLIGHT_SLOTS[9].color).toBe('#2d6eff');
  });
});

// ---------------------------------------------------------------------------
// allocateSlot
// ---------------------------------------------------------------------------

describe('allocateSlot', () => {
  it('returns 0 when active is empty', () => {
    expect(allocateSlot({})).toBe(0);
  });

  it('returns the lowest unused index', () => {
    expect(allocateSlot({ a: 0, b: 2 })).toBe(1);
  });

  it('returns -1 when all 10 slots are taken', () => {
    const active: Record<string, number> = {};
    for (let i = 0; i < 10; i++) {
      active[`--var-${i}`] = i;
    }
    expect(allocateSlot(active)).toBe(-1);
  });

  it('returns 0 when only slot 0 is available', () => {
    const active: Record<string, number> = {};
    for (let i = 1; i < 10; i++) {
      active[`--var-${i}`] = i;
    }
    expect(allocateSlot(active)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// toggleHighlight
// ---------------------------------------------------------------------------

describe('toggleHighlight', () => {
  const base: HighlightState = {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    active: {},
  };

  it('first toggle on --a assigns slot 0', () => {
    const next = toggleHighlight(base, '--a');
    expect(next.active).toEqual({ '--a': 0 });
  });

  it('sequential toggles --a, --b, --c assign slots 0, 1, 2', () => {
    let state = toggleHighlight(base, '--a');
    state = toggleHighlight(state, '--b');
    state = toggleHighlight(state, '--c');
    expect(state.active).toEqual({ '--a': 0, '--b': 1, '--c': 2 });
  });

  it('reservation-sheet: toggling off --a and --b leaves --c at slot 2', () => {
    let state = toggleHighlight(base, '--a');
    state = toggleHighlight(state, '--b');
    state = toggleHighlight(state, '--c');
    // Release --a and --b
    state = toggleHighlight(state, '--a');
    state = toggleHighlight(state, '--b');
    expect(state.active).toEqual({ '--c': 2 });
  });

  it('reservation-sheet: after releasing --a and --b, --d claims slot 0', () => {
    let state = toggleHighlight(base, '--a');
    state = toggleHighlight(state, '--b');
    state = toggleHighlight(state, '--c');
    state = toggleHighlight(state, '--a');
    state = toggleHighlight(state, '--b');
    state = toggleHighlight(state, '--d');
    expect(state.active).toEqual({ '--c': 2, '--d': 0 });
  });

  it('toggle on active var removes the mapping', () => {
    const withA: HighlightState = { ...base, active: { '--a': 0 } };
    const next = toggleHighlight(withA, '--a');
    expect(next.active).toEqual({});
  });

  it('returns new state objects (immutable)', () => {
    const next = toggleHighlight(base, '--a');
    expect(next).not.toBe(base);
    expect(next.active).not.toBe(base.active);
  });

  it('all-taken: returns same state reference and warns', () => {
    const active: Record<string, number> = {};
    for (let i = 0; i < 10; i++) {
      active[`--var-${i}`] = i;
    }
    const fullState: HighlightState = { ...base, active };
    const result = toggleHighlight(fullState, '--new');
    expect(result).toBe(fullState);
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// resetSlots
// ---------------------------------------------------------------------------

describe('resetSlots', () => {
  it('restores slot colors to defaults', () => {
    const modified: HighlightState = {
      slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s, color: '#000000' })),
      active: { '--x': 3 },
    };
    const next = resetSlots(modified);
    expect(next.slots).toEqual(DEFAULT_HIGHLIGHT_SLOTS);
  });

  it('preserves the active map', () => {
    const state: HighlightState = {
      slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s, color: '#000000' })),
      active: { '--x': 3, '--y': 7 },
    };
    const next = resetSlots(state);
    expect(next.active).toEqual({ '--x': 3, '--y': 7 });
  });

  it('returns a new state object (immutable)', () => {
    const state: HighlightState = {
      slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
      active: {},
    };
    const next = resetSlots(state);
    expect(next).not.toBe(state);
    expect(next.slots).not.toBe(state.slots);
  });
});

// ---------------------------------------------------------------------------
// clearAllActive
// ---------------------------------------------------------------------------

describe('clearAllActive', () => {
  it('returns state with empty active map', () => {
    const state: HighlightState = {
      slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
      active: { '--color-brand': 0, '--text-sm': 2, '--spacing-md': 5 },
    };
    const next = clearAllActive(state);
    expect(next.active).toEqual({});
  });

  it('preserves slots unchanged', () => {
    const customSlots = DEFAULT_HIGHLIGHT_SLOTS.map((s, i) =>
      i === 0 ? { color: '#aabbcc', outlineWidth: 4 } : { ...s },
    );
    const state: HighlightState = {
      slots: customSlots,
      active: { '--token-x': 0, '--token-y': 3 },
    };
    const next = clearAllActive(state);
    expect(next.slots).toEqual(customSlots);
  });

  it('returns a new state object (immutable)', () => {
    const state: HighlightState = {
      slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
      active: { '--a': 0 },
    };
    const next = clearAllActive(state);
    expect(next).not.toBe(state);
    expect(next.active).not.toBe(state.active);
  });

  it('returns state with empty active when already empty', () => {
    const state: HighlightState = {
      slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
      active: {},
    };
    const next = clearAllActive(state);
    expect(next.active).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// setSlot
// ---------------------------------------------------------------------------

describe('setSlot', () => {
  const base: HighlightState = {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    active: {},
  };

  it('merges partial into the specified slot', () => {
    const next = setSlot(base, 0, { color: '#aabbcc' });
    expect(next.slots[0]).toEqual({ color: '#aabbcc', outlineWidth: 2 });
  });

  it('leaves other slots unchanged', () => {
    const next = setSlot(base, 0, { color: '#aabbcc' });
    for (let i = 1; i < 10; i++) {
      expect(next.slots[i]).toEqual(DEFAULT_HIGHLIGHT_SLOTS[i]);
    }
  });

  it('returns state unchanged for out-of-range index (negative)', () => {
    const next = setSlot(base, -1, { color: '#aabbcc' });
    expect(next).toBe(base);
  });

  it('returns state unchanged for out-of-range index (≥ 10)', () => {
    const next = setSlot(base, 10, { color: '#aabbcc' });
    expect(next).toBe(base);
  });

  it('returns a new state object (immutable)', () => {
    const next = setSlot(base, 0, { color: '#aabbcc' });
    expect(next).not.toBe(base);
    expect(next.slots).not.toBe(base.slots);
  });

  it('can update outlineWidth independently', () => {
    const next = setSlot(base, 3, { outlineWidth: 4 });
    expect(next.slots[3]).toEqual({ color: DEFAULT_HIGHLIGHT_SLOTS[3].color, outlineWidth: 4 });
  });
});

// ---------------------------------------------------------------------------
// Persistence — loadHighlightState / saveHighlightState
// ---------------------------------------------------------------------------

describe('loadHighlightState — default (empty storage)', () => {
  it('returns DEFAULT_HIGHLIGHT_SLOTS and empty active when storage is empty', () => {
    const state = loadHighlightState();
    expect(state.slots).toEqual(DEFAULT_HIGHLIGHT_SLOTS);
    expect(state.active).toEqual({});
  });
});

describe('saveHighlightState / loadHighlightState — round-trip', () => {
  it('round-trips slots and active correctly', () => {
    const original: HighlightState = {
      slots: DEFAULT_HIGHLIGHT_SLOTS.map((s, i) =>
        i === 0 ? { color: '#112233', outlineWidth: 3 } : { ...s },
      ),
      active: { '--token-a': 0, '--token-b': 5 },
    };

    saveHighlightState(original);
    const loaded = loadHighlightState();

    expect(loaded.slots).toEqual(original.slots);
    expect(loaded.active).toEqual(original.active);
  });

  it('slots are stored in localStorage (not sessionStorage)', () => {
    const state: HighlightState = {
      slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
      active: {},
    };
    saveHighlightState(state);

    const prefix = getPanelConfig().storagePrefix;
    const slotsKey = `${prefix}-highlight-slots`;
    const activeKey = `${prefix}-highlight-active`;

    // slots must be in localStorage
    expect(localStorage.getItem(slotsKey)).not.toBeNull();
    // active must NOT be in localStorage
    expect(localStorage.getItem(activeKey)).toBeNull();
  });

  it('active is stored in sessionStorage (not localStorage)', () => {
    const state: HighlightState = {
      slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
      active: { '--token-x': 2 },
    };
    saveHighlightState(state);

    const prefix = getPanelConfig().storagePrefix;
    const slotsKey = `${prefix}-highlight-slots`;
    const activeKey = `${prefix}-highlight-active`;

    // active must be in sessionStorage
    expect(sessionStorage.getItem(activeKey)).not.toBeNull();
    // slots must NOT be in sessionStorage
    expect(sessionStorage.getItem(slotsKey)).toBeNull();
  });
});

describe('loadHighlightState — storage key contains storagePrefix', () => {
  it('uses the storagePrefix from getPanelConfig() in the key', () => {
    const prefix = getPanelConfig().storagePrefix;
    const state: HighlightState = {
      slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
      active: { '--token-a': 1 },
    };
    saveHighlightState(state);

    expect(localStorage.getItem(`${prefix}-highlight-slots`)).not.toBeNull();
    expect(sessionStorage.getItem(`${prefix}-highlight-active`)).not.toBeNull();
  });
});

describe('loadHighlightState — corrupt storage degrades gracefully', () => {
  it('returns defaults when localStorage contains invalid JSON for slots', () => {
    const prefix = getPanelConfig().storagePrefix;
    localStorage.setItem(`${prefix}-highlight-slots`, 'not-json{{{');
    const state = loadHighlightState();
    expect(state.slots).toEqual(DEFAULT_HIGHLIGHT_SLOTS);
    expect(state.active).toEqual({});
  });

  it('returns empty active when sessionStorage contains invalid JSON', () => {
    const prefix = getPanelConfig().storagePrefix;
    // Put valid slots so we can verify active independently
    saveHighlightState({ slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })), active: {} });
    sessionStorage.setItem(`${prefix}-highlight-active`, 'not-json{{{');
    const state = loadHighlightState();
    expect(state.active).toEqual({});
  });
});
