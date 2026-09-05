// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { useMemo, useRef } from 'preact/compat';
import { LayerActivityProvider, useLayerActivity, useLayerRegistration } from '../layer-activity';
import { ShellFooter } from '../footer';
import { ShellRegionsProvider, useRegisterRegionItem } from '../regions';
import { ShortcutProvider, useShortcut } from '../shortcut-dispatcher';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  document.body.innerHTML = '';
});

function ShortcutInstance({ id, onShortcut }: { id: string; onShortcut: () => void }) {
  const shellRef = useRef<HTMLDivElement>(null);
  return (
    <ShortcutProvider shellRef={shellRef} enabled>
      <ShortcutRegistration onShortcut={onShortcut} />
      <div ref={shellRef} data-shell={id} tabIndex={0}>
        {id}
      </div>
    </ShortcutProvider>
  );
}

function ShortcutRegistration({ onShortcut }: { onShortcut: () => void }) {
  useShortcut({ key: 'k', metaKey: true }, onShortcut);
  return null;
}

function SwappableShortcutInstance({
  root,
  onShortcut,
}: {
  root: 'first' | 'second' | 'none';
  onShortcut: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  return (
    <ShortcutProvider shellRef={shellRef} enabled>
      <ShortcutRegistration onShortcut={onShortcut} />
      {root !== 'none' && <div key={root} ref={shellRef} data-shell={root} />}
    </ShortcutProvider>
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
      render(
        <>
          <ShortcutInstance id="first" onShortcut={first} />
          <ShortcutInstance id="second" onShortcut={second} />
        </>,
        container,
      );
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
    act(() => render(<ShortcutInstance id="only" onShortcut={handler} />, container));
    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => pressCommandK(input));
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps dispatching when the owner root swaps and stops with no connected root', () => {
    const handler = vi.fn();
    act(() =>
      render(<SwappableShortcutInstance root="first" onShortcut={handler} />, container),
    );
    act(() => pressCommandK());
    expect(handler).toHaveBeenCalledOnce();

    act(() =>
      render(<SwappableShortcutInstance root="second" onShortcut={handler} />, container),
    );
    act(() => pressCommandK());
    expect(handler).toHaveBeenCalledTimes(2);

    act(() => render(<SwappableShortcutInstance root="none" onShortcut={handler} />, container));
    act(() => pressCommandK());
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

function LayerProbe({ modal, popover }: { modal: boolean; popover: boolean }) {
  useLayerRegistration('modal', modal);
  useLayerRegistration('popover', popover);
  const active = useLayerActivity();
  return <div data-active={String(active)} />;
}

describe('layer activity signal', () => {
  it('stays active until every registered layer closes', () => {
    const probe = () => container.querySelector('[data-active]')?.getAttribute('data-active');
    act(() => {
      render(
        <LayerActivityProvider>
          <LayerProbe modal={false} popover={false} />
        </LayerActivityProvider>,
        container,
      );
    });
    expect(probe()).toBe('false');

    act(() => {
      render(
        <LayerActivityProvider>
          <LayerProbe modal popover />
        </LayerActivityProvider>,
        container,
      );
    });
    expect(probe()).toBe('true');

    act(() => {
      render(
        <LayerActivityProvider>
          <LayerProbe modal={false} popover />
        </LayerActivityProvider>,
        container,
      );
    });
    expect(probe()).toBe('true');

    act(() => {
      render(
        <LayerActivityProvider>
          <LayerProbe modal={false} popover={false} />
        </LayerActivityProvider>,
        container,
      );
    });
    expect(probe()).toBe('false');
  });
});

function FooterRegistration() {
  const item = useMemo(
    () => ({ id: 'status', render: () => <div data-region-item="">Ready</div> }),
    [],
  );
  useRegisterRegionItem('footer', item);
  return null;
}

describe('shell regions', () => {
  it('renders items registered after the provider mounts', () => {
    act(() => {
      render(
        <ShellRegionsProvider>
          <FooterRegistration />
          <ShellFooter />
        </ShellRegionsProvider>,
        container,
      );
    });
    expect(container.querySelector('[data-region-item]')?.textContent).toBe('Ready');
  });
});
