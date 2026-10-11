// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mountTokenDashboard, type TokenDashboardProps } from '../client';

const props: TokenDashboardProps = {
  tabs: [{ id: 'colors', label: 'Colors', tiers: [{
    id: 'palette', label: 'Palette', items: [{
      id: 'blue', label: 'Blue token', cssVar: '--blue', default: '#2563eb', type: { kind: 'color' },
    }],
  }] }],
};

function host() {
  const element = document.createElement('div');
  element.id = 'host-owned';
  element.dataset.owner = 'host';
  document.body.append(element);
  return element;
}

describe('dashboard client mount lifecycle', () => {
  it('mounts synchronously into an empty host and leaves its element and attributes on disposal', () => {
    const element = host();
    const handle = mountTokenDashboard(element, props);
    expect(element.querySelectorAll('.zdtp-dashboard')).toHaveLength(1);
    expect(element.textContent).toContain('Blue token');
    handle.dispose();
    handle.dispose();
    expect(element.childNodes).toHaveLength(0);
    expect(element.isConnected).toBe(true);
    expect(element.id).toBe('host-owned');
    expect(element.dataset.owner).toBe('host');
    element.remove();
  });

  it('rejects an occupied unowned host without changing its children', () => {
    const element = host();
    const child = document.createElement('span');
    child.textContent = 'Host content';
    element.append(child);
    expect(() => mountTokenDashboard(element, props)).toThrow('requires an empty host');
    expect(element.firstChild).toBe(child);
    element.remove();
  });

  it('replaces its earlier mount; an old disposer cannot remove the replacement', () => {
    const element = host();
    const first = mountTokenDashboard(element, props);
    const second = mountTokenDashboard(element, { ...props, title: 'Second dashboard' });
    expect(element.querySelectorAll('.zdtp-dashboard')).toHaveLength(1);
    expect(element.textContent).toContain('Second dashboard');
    first.dispose();
    expect(element.textContent).toContain('Second dashboard');
    second.dispose();
    expect(element.childNodes).toHaveLength(0);
    const third = mountTokenDashboard(element, props);
    expect(element.textContent).toContain('Blue token');
    third.dispose();
    element.remove();
  });

  it('keeps separate hosts independent', () => {
    const firstHost = host();
    const secondHost = host();
    const first = mountTokenDashboard(firstHost, props);
    const second = mountTokenDashboard(secondHost, { ...props, title: 'Other dashboard' });
    first.dispose();
    expect(firstHost.childNodes).toHaveLength(0);
    expect(secondHost.textContent).toContain('Other dashboard');
    second.dispose();
    firstHost.remove();
    secondHost.remove();
  });

  it('releases ownership after a render error', () => {
    const element = host();
    expect(() => mountTokenDashboard(element, { tabs: null } as unknown as TokenDashboardProps)).toThrow();
    expect(element.childNodes).toHaveLength(0);
    const handle = mountTokenDashboard(element, props);
    expect(element.textContent).toContain('Blue token');
    handle.dispose();
    element.remove();
  });
});
