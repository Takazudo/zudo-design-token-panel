// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  addClass,
  formatSessionDiff,
  getElementRecord,
  getSessionDiff,
  getSessionRecords,
  removeClass,
  resetAll,
  resetElement,
} from '../edit-session';

function classTokens(el: Element): string[] {
  return Array.from(el.classList);
}

describe('DOM Tweaker edit session', () => {
  beforeEach(() => {
    resetAll();
    document.body.textContent = '';
  });

  it('adds, removes, and resets classes on the live DOM', () => {
    const first = document.createElement('div');
    first.setAttribute('class', 'px-2 rounded-md');
    const second = document.createElement('div');
    second.setAttribute('class', 'text-sm');
    document.body.append(first, second);

    addClass(first, 'bg-red-500');
    expect(classTokens(first)).toEqual(['px-2', 'rounded-md', 'bg-red-500']);
    expect(getElementRecord(first)).toMatchObject({
      originalClasses: ['px-2', 'rounded-md'],
      currentClasses: ['px-2', 'rounded-md', 'bg-red-500'],
    });

    removeClass(first, 'rounded-md');
    expect(classTokens(first)).toEqual(['px-2', 'bg-red-500']);

    resetElement(first);
    expect(classTokens(first)).toEqual(['px-2', 'rounded-md']);
    expect(getElementRecord(first)).toBeNull();
    expect(formatSessionDiff()).toBe('');

    addClass(first, 'px-24');
    addClass(second, 'font-bold');
    expect(classTokens(first)).toEqual(['rounded-md', 'px-24']);
    expect(classTokens(second)).toEqual(['text-sm', 'font-bold']);

    resetAll();
    expect(classTokens(first)).toEqual(['px-2', 'rounded-md']);
    expect(classTokens(second)).toEqual(['text-sm']);
    expect(getSessionRecords()).toEqual([]);
    expect(formatSessionDiff()).toBe('');
  });

  it('routes adds through tailwind-merge for conflict resolution', () => {
    const spacing = document.createElement('div');
    spacing.setAttribute('class', 'px-2');
    document.body.append(spacing);

    addClass(spacing, 'px-24');
    expect(classTokens(spacing)).toEqual(['px-24']);

    resetAll();
    const radius = document.createElement('div');
    radius.setAttribute('class', 'rounded-md');
    document.body.append(radius);

    addClass(radius, 'rounded-full');
    expect(classTokens(radius)).toEqual(['rounded-full']);

    resetAll();
    const nonConflicting = document.createElement('div');
    nonConflicting.setAttribute('class', 'px-2');
    document.body.append(nonConflicting);

    addClass(nonConflicting, 'bg-red-500');
    expect(classTokens(nonConflicting)).toEqual(['px-2', 'bg-red-500']);
  });

  it('captures selector, summary, and original classes only at first edit', () => {
    const target = document.createElement('button');
    target.id = 'save';
    target.setAttribute('class', 'px-2 rounded-md');
    document.body.append(target);

    addClass(target, 'px-24');
    const firstRecord = getElementRecord(target);
    expect(firstRecord).toEqual({
      selector: '#save',
      summary: 'button#save.px-2.rounded-md',
      originalClasses: ['px-2', 'rounded-md'],
      currentClasses: ['rounded-md', 'px-24'],
    });

    target.id = 'changed-after-first-edit';
    addClass(target, 'rounded-full');
    removeClass(target, 'px-24');

    expect(getElementRecord(target)).toEqual({
      selector: '#save',
      summary: 'button#save.px-2.rounded-md',
      originalClasses: ['px-2', 'rounded-md'],
      currentClasses: ['rounded-full'],
    });
  });

  it('edits SVG elements through classList-safe access', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'fill-red-500 opacity-50');
    svg.append(rect);
    document.body.append(svg);

    addClass(rect, 'opacity-100');
    expect(rect.getAttribute('class')).toBe('fill-red-500 opacity-100');

    removeClass(rect, 'fill-red-500');
    expect(rect.getAttribute('class')).toBe('opacity-100');

    resetElement(rect);
    expect(rect.getAttribute('class')).toBe('fill-red-500 opacity-50');
  });

  it('formats AI-handoff diffs and flags disconnected edited elements', () => {
    const card = document.createElement('div');
    card.id = 'card';
    card.setAttribute('class', 'px-2 rounded-md text-sm');
    const toast = document.createElement('span');
    toast.id = 'toast';
    toast.setAttribute('class', 'opacity-50');
    document.body.append(card, toast);

    addClass(card, 'px-24');
    addClass(card, 'rounded-full');
    removeClass(card, 'text-sm');
    addClass(toast, 'opacity-100');
    toast.remove();

    expect(getSessionDiff()).toEqual([
      {
        selector: '#card',
        summary: 'div#card.px-2.rounded-md',
        originalClasses: ['px-2', 'rounded-md', 'text-sm'],
        currentClasses: ['px-24', 'rounded-full'],
        removedClasses: ['px-2', 'rounded-md', 'text-sm'],
        addedClasses: ['px-24', 'rounded-full'],
        isConnected: true,
      },
      {
        selector: '#toast',
        summary: 'span#toast.opacity-50',
        originalClasses: ['opacity-50'],
        currentClasses: ['opacity-100'],
        removedClasses: ['opacity-50'],
        addedClasses: ['opacity-100'],
        isConnected: false,
      },
    ]);

    expect(formatSessionDiff()).toBe(
      [
        'selector: #card',
        'before: "px-2 rounded-md text-sm"',
        'after: "px-24 rounded-full"',
        'diff: -px-2 -rounded-md -text-sm +px-24 +rounded-full',
        '',
        'selector: #toast (removed)',
        'before: "opacity-50"',
        'after: "opacity-100"',
        'diff: -opacity-50 +opacity-100',
      ].join('\n'),
    );
  });

  it('returns an empty string for an empty session', () => {
    expect(formatSessionDiff()).toBe('');
  });
});
