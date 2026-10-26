// @vitest-environment jsdom
/** @jsxImportSource @takazudo/zfb/zudo-react */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountOwnedRoot, OwnedRootError } from '../root';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function Hello({ name }: { name: string }) {
  return <span class="hello">{name}</span>;
}

describe('mountOwnedRoot', () => {
  it('mounts and strips the zfb island identity attributes from the wrapper', () => {
    const wrapper = document.body.appendChild(document.createElement('div'));
    const root = mountOwnedRoot(wrapper, Hello, { name: 'zdtp' });
    expect(wrapper.querySelector('.hello')?.textContent).toBe('zdtp');
    expect(wrapper.getAttributeNames()).toEqual([]);
    root.unmount();
    expect(wrapper.childNodes).toHaveLength(0);
  });

  it('allows a second root to mount inside an existing root tree', () => {
    const outer = document.body.appendChild(document.createElement('div'));
    mountOwnedRoot(outer, Hello, { name: 'outer' });
    const inner = outer.appendChild(document.createElement('div'));
    mountOwnedRoot(inner, Hello, { name: 'inner' });
    const sibling = document.body.appendChild(document.createElement('div'));
    // A stale marker in an ancestor's subtree would make this mount fail.
    expect(() => mountOwnedRoot(sibling, Hello, { name: 'sibling' })).not.toThrow();
    expect(inner.textContent).toBe('inner');
  });

  it('throws an OwnedRootError and leaves no markers when setup fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = document.body.appendChild(document.createElement('div'));
    function Broken(): never {
      throw new Error('boom');
    }
    expect(() => mountOwnedRoot(wrapper, Broken, {})).toThrow(OwnedRootError);
    expect(wrapper.getAttributeNames()).toEqual([]);
    expect(wrapper.childNodes).toHaveLength(0);
  });
});
