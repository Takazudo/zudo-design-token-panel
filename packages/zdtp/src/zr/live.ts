import type { ReadonlySignal } from '@takazudo/zfb/zudo-react';

/**
 * Props as a zudo-react component receives them: every data prop is a live
 * readonly signal, while the listed callback keys stay plain functions.
 */
export type Live<P, C extends keyof P = never> = {
  readonly [K in Exclude<keyof P, C>]-?: ReadonlySignal<P[K]>;
} & Pick<P, C>;
