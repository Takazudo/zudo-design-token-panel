import { useLayoutEffect, useRef } from 'preact/hooks';
import type { FunctionComponent, JSX } from 'preact';
import { batch, signal, type Component, type Signal } from '@takazudo/zfb/zudo-react';
import type { Live } from './live';
import { mountOwnedRoot, type RootHandle } from './root';

type Callback = (...args: never[]) => unknown;

interface BridgeKeys<P, C extends keyof P> {
  /** Data props, delivered to the zudo-react component as live signals. */
  signals: ReadonlyArray<Exclude<keyof P, C>>;
  /**
   * Function props, delivered as stable wrappers that call the latest prop.
   * Presence is fixed at mount.
   */
  callbacks?: ReadonlyArray<C>;
  /** Props read once at mount (e.g. an instance config or a controller). */
  statics?: ReadonlyArray<C>;
}

/**
 * Wrap a zudo-react component so a Preact parent can render it during the
 * Preact → zudo-react migration (epic #1075). The component is mounted once
 * into a `display: contents` host; later Preact renders only update its prop
 * signals, so DOM updates land on zudo-react's next microtask flush rather
 * than synchronously inside the Preact commit. Remove once every caller of
 * the component is itself a zudo-react component.
 */
export function bridgeToPreact<P extends object, C extends keyof P = never>(
  component: Component<Live<P, C>>,
  keys: BridgeKeys<P, C>,
): FunctionComponent<P> {
  function ZrBridge(props: P): JSX.Element {
    const host = useRef<HTMLDivElement>(null);
    const latest = useRef(props);
    latest.current = props;
    const state = useRef<{ signals: Map<keyof P, Signal<unknown>>; live: Live<P, C> } | null>(null);
    if (state.current === null) {
      const signals = new Map<keyof P, Signal<unknown>>();
      const live: Record<PropertyKey, unknown> = {};
      for (const key of keys.signals) {
        const value = signal<unknown>(props[key]);
        signals.set(key, value);
        live[key as PropertyKey] = value;
      }
      for (const key of keys.statics ?? []) live[key as PropertyKey] = props[key];
      for (const key of keys.callbacks ?? []) {
        // An optional callback absent at mount stays absent, since components
        // branch on its presence (e.g. bulk controls only with onBulkApply).
        if (typeof props[key] !== 'function') continue;
        live[key as PropertyKey] = (...args: never[]) => {
          const callback = latest.current[key] as Callback | undefined;
          return typeof callback === 'function' ? callback(...args) : undefined;
        };
      }
      state.current = { signals, live: live as Live<P, C> };
    }

    useLayoutEffect(() => {
      const current = state.current!;
      batch(() => {
        for (const [key, value] of current.signals) value.value = latest.current[key];
      });
    });

    useLayoutEffect(() => {
      const element = host.current!;
      let root: RootHandle | null = null;
      let retry = 0;
      // zudo-react only mounts into a connected root, while Preact may render
      // into a detached container that is attached later.
      const tryMount = () => {
        retry = 0;
        if (element.isConnected) root = mountOwnedRoot(element, component, state.current!.live);
        else retry = setTimeout(tryMount, 16) as unknown as number;
      };
      tryMount();
      return () => {
        clearTimeout(retry);
        root?.unmount();
        root = null;
      };
    }, []);

    return <div ref={host} className="tokenpanel-zr-host" style={{ display: 'contents' }} />;
  }
  ZrBridge.displayName = `ZrBridge(${component.name || 'Component'})`;
  // Keep the wrapped component's name so vnode-hook tests that match on
  // `type.name` still find the bridged component.
  Object.defineProperty(ZrBridge, 'name', { value: component.name });
  return ZrBridge;
}
