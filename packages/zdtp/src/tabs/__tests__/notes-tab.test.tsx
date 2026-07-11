// @vitest-environment jsdom

/**
 * Unit tests for NotesTab (#515).
 *
 * Acceptance criteria exercised here:
 *  1. `notesExtras.title` renders as a `div[role="heading"][aria-level="3"]`,
 *     never an hN tag.
 *  2. `notesExtras.html` renders as sanitized HTML inside `.tokenpanel-notes-body`
 *     (a hostile payload embedded in the manifest is stripped end-to-end,
 *     proving the component actually calls the sanitizer — the sanitizer's
 *     own exhaustive matrix lives in utils/__tests__/sanitize-html.test.ts).
 *  3. Renders nothing when notesExtras is absent (defensive fallback; the
 *     real contract is enforced upstream by assertValidPanelConfig).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import NotesTab from '../notes-tab';
import type { TabConfig } from '../../tokens/tier-model';

const NOTES_TAB: TabConfig = {
  id: 'notes',
  label: 'Notes',
  tiers: [],
  notesExtras: {
    title: 'Welcome to the token panel',
    html: '<p>Some <strong>bold</strong> prose with a <script>alert(1)</script> payload.</p>',
  },
};

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

describe('NotesTab', () => {
  it('renders the title as div[role=heading][aria-level=3], never an hN tag', () => {
    act(() => {
      render(<NotesTab tab={NOTES_TAB} />, container);
    });
    const heading = container.querySelector('[role="heading"]');
    expect(heading).not.toBeNull();
    expect(heading?.getAttribute('aria-level')).toBe('3');
    expect(heading?.textContent).toBe('Welcome to the token panel');
    expect(container.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
  });

  it('renders sanitized HTML in the body — allowed markup survives, script payload is stripped', () => {
    act(() => {
      render(<NotesTab tab={NOTES_TAB} />, container);
    });
    const body = container.querySelector('.tokenpanel-notes-body');
    expect(body).not.toBeNull();
    expect(body?.innerHTML).toContain('<strong>bold</strong>');
    expect(body?.innerHTML).not.toContain('<script');
    expect(body?.textContent).not.toContain('alert(1)');
  });

  it('renders nothing when notesExtras is absent', () => {
    const bareTab: TabConfig = { id: 'notes', label: 'Notes', tiers: [] };
    act(() => {
      render(<NotesTab tab={bareTab} />, container);
    });
    expect(container.innerHTML).toBe('');
  });
});
