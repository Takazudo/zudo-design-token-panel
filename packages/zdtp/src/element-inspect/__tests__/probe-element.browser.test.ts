// @vitest-environment browser

import { afterEach, describe, expect, it } from 'vitest';
import { probeElementForToken } from '../../highlight/find-elements';

const created: Element[] = [];

function fixture(css: string, className: string): HTMLElement {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  created.push(style);
  const el = document.createElement('div');
  el.className = className;
  document.body.appendChild(el);
  created.push(el);
  return el;
}

afterEach(() => {
  for (const el of created.splice(0)) el.remove();
  document.documentElement.style.removeProperty('--probe-space');
});

describe('probeElementForToken', () => {
  it('reports each computed padding longhand changed by a padding token', () => {
    const el = fixture(
      ':root { --probe-space: 12px; } .probe-padding { padding: var(--probe-space); }',
      'probe-padding',
    );

    expect(probeElementForToken(el, '--probe-space', 'length')).toEqual(expect.arrayContaining([
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
    ]));
  });

  it('reports nothing when the token-backed declaration loses the cascade', () => {
    const el = fixture(
      ':root { --probe-space: 12px; } .probe-losing { padding: var(--probe-space); padding: 20px; }',
      'probe-losing',
    );

    expect(probeElementForToken(el, '--probe-space', 'length')).toEqual([]);
  });
});
