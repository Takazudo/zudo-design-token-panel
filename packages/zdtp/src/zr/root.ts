import { h, type Component, type Diagnostic } from '@takazudo/zfb/zudo-react';
import { mount, type RootHandle } from '@takazudo/zfb/zudo-react/client';

export type { RootHandle } from '@takazudo/zfb/zudo-react/client';

// zudo-react's caller-owned mount protocol: the wrapper must carry these
// attributes, and the root child must be a function component whose
// `displayName ?? name` equals the identity component.
const ROOT_COMPONENT = 'ZdtpRoot';
const ROOT_BUILD = 'zdtp-owned-root-v1';
const IDENTITY_ATTRIBUTES: ReadonlyArray<readonly [string, string]> = [
  ['data-zfb-island-skip-ssr', ROOT_COMPONENT],
  ['data-zfb-transport', 'json/1'],
  ['data-zfb-protocol', 'zudo-react/1'],
  ['data-zfb-build', ROOT_BUILD],
];

export class OwnedRootError extends Error {
  readonly diagnostic: Diagnostic | undefined;
  constructor(message: string, diagnostic?: Diagnostic, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OwnedRootError';
    this.diagnostic = diagnostic;
  }
}

/**
 * Mount `component` into `wrapper` as an independent zudo-react root.
 *
 * The identity attributes exist only for the duration of `mount()`. zfb's host
 * island scanner (`mountNewIslands` / `unmountIslands`) treats every
 * `[data-zfb-island-skip-ssr]` in the document as its own island and disposes
 * roots it did not create, so leaving them in place would let a zfb host's
 * client-side navigation tear down the panel's roots.
 */
export function mountOwnedRoot<P extends object>(
  wrapper: Element,
  component: Component<P>,
  props: P,
): RootHandle {
  function ZdtpRoot() {
    return h(component as Component<Record<string, unknown>>, props as Record<string, unknown>);
  }
  ZdtpRoot.displayName = ROOT_COMPONENT;

  for (const [name, value] of IDENTITY_ATTRIBUTES) wrapper.setAttribute(name, value);
  let mounted = false;
  let failure: Diagnostic | undefined;
  let thrown: unknown;
  let root: RootHandle | null = null;
  try {
    root = mount(h(ZdtpRoot, null), wrapper, {
      identity: { component: ROOT_COMPONENT, build: ROOT_BUILD },
      report(diagnostic) {
        if (!mounted) failure ??= diagnostic;
        console.error(`[zdtp] zudo-react ${diagnostic.code} (${diagnostic.phase})`, diagnostic);
      },
    });
  } catch (error) {
    thrown = error;
  } finally {
    for (const [name] of IDENTITY_ATTRIBUTES) wrapper.removeAttribute(name);
  }
  if (root === null) {
    const detail = failure ? `${failure.code}: ${failure.actual}` : String(thrown ?? 'unknown failure');
    throw new OwnedRootError(`zudo-react mount failed (${detail})`, failure, { cause: thrown });
  }
  mounted = true;
  return root;
}
