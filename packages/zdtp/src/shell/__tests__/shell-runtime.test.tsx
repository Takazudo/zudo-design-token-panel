// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, getScope, signal, type Ref } from '@takazudo/zfb/zudo-react';
import { act, renderZr, unmountZrIn } from '../../zr/test-utils';
import { Rebuild } from '../../zr/rebuild';
import { createLayerActivity, useLayerRegistration } from '../layer-activity';
import { ShellFooter } from '../footer';
import { createShellRegions, useRegisterRegionItem } from '../regions';
import { createShortcutDispatcher, useShortcut } from '../shortcut-dispatcher';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => unmountZrIn(container));
  container.remove();
  document.body.innerHTML = '';
});

function ShortcutInstance({ id, onShortcut }: { id: string; onShortcut: () => void }) {
  const shellRef: Ref<HTMLDivElement> = { current: null };
  const shortcuts = createShortcutDispatcher();
  useShortcut(shortcuts, { key: 'k', metaKey: true }, onShortcut);
  getScope().onActivate(() => shortcuts.attach(() => shellRef.current));
  return (
    <div ref={shellRef} data-shell={id} tabindex={0}>
      {id}
    </div>
  );
}

function SwappableShortcutInstance({
  root,
  onShortcut,
}: {
  root: { value: 'first' | 'second' | 'none' };
  onShortcut: () => void;
}) {
  const shellRef: Ref<HTMLDivElement> = { current: null };
  const shortcuts = createShortcutDispatcher();
  useShortcut(shortcuts, { key: 'k', metaKey: true }, onShortcut);
  getScope().onActivate(() => shortcuts.attach(() => shellRef.current));
  return (
    <Rebuild value={computed(() => root.value)}>
      {(current) => {
        if (current === 'none') {
          shellRef.current = null;
          return null;
        }
        return <div ref={shellRef} data-shell={current} />;
      }}
    </Rebuild>
  );
}

function pressCommandK(target: EventTarget = document.body) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('per-instance shortcut dispatcher', () => {
  it('routes a global binding only to the last-interacted shell', () => {
    const first = vi.fn();
    const second = vi.fn();
    act(() => {
      renderZr(() => [
        <ShortcutInstance id="first" onShortcut={first} />,
        <ShortcutInstance id="second" onShortcut={second} />,
      ], container);
    });
    const firstShell = container.querySelector('[data-shell="first"]') as HTMLElement;
    const secondShell = container.querySelector('[data-shell="second"]') as HTMLElement;

    act(() => {
      secondShell.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      pressCommandK();
    });
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();

    act(() => {
      firstShell.focus();
      pressCommandK();
    });
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('does not fire for an editable host target outside the owning shell', () => {
    const handler = vi.fn();
    act(() => renderZr(() => <ShortcutInstance id="only" onShortcut={handler} />, container));
    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => pressCommandK(input));
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps dispatching when the owner root swaps and stops with no connected root', () => {
    const handler = vi.fn();
    const root = signal<'first' | 'second' | 'none'>('first');
    act(() =>
      renderZr(() => <SwappableShortcutInstance root={root} onShortcut={handler} />, container),
    );
    act(() => pressCommandK());
    expect(handler).toHaveBeenCalledOnce();

    act(() => {
      root.value = 'second';
    });
    expect(container.querySelector('[data-shell="second"]')).not.toBeNull();
    act(() => pressCommandK());
    expect(handler).toHaveBeenCalledTimes(2);

    act(() => {
      root.value = 'none';
    });
    act(() => pressCommandK());
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('layer activity signal', () => {
  it('stays active until every registered layer closes', () => {
    const layers = createLayerActivity();
    const modal = signal(false);
    const popover = signal(false);
    function LayerProbe() {
      useLayerRegistration(layers, 'modal', modal);
      useLayerRegistration(layers, 'popover', popover);
      return <div data-active={computed(() => String(layers.active.value))} />;
    }
    const probe = () => container.querySelector('[data-active]')?.getAttribute('data-active');
    act(() => {
      renderZr(() => <LayerProbe />, container);
    });
    expect(probe()).toBe('false');

    act(() => {
      modal.value = true;
      popover.value = true;
    });
    expect(probe()).toBe('true');

    act(() => {
      modal.value = false;
    });
    expect(probe()).toBe('true');

    act(() => {
      popover.value = false;
    });
    expect(probe()).toBe('false');
  });
});

describe('shell regions', () => {
  it('renders items registered after the registry is created', () => {
    const regions = createShellRegions();
    function FooterRegistration() {
      useRegisterRegionItem(regions, 'footer', {
        id: 'status',
        render: () => <div data-region-item="">Ready</div>,
      });
      return null;
    }
    act(() => {
      renderZr(() => [<FooterRegistration />, <ShellFooter regions={regions} />], container);
    });
    expect(container.querySelector('[data-region-item]')?.textContent).toBe('Ready');
  });
});
