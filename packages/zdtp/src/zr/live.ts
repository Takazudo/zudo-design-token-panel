import { computed, type ReadonlySignal } from '@takazudo/zfb/zudo-react';

/**
 * Props as a zudo-react component receives them: every data prop is a live
 * readonly signal, while the listed callback keys stay plain functions.
 */
export type Live<P, C extends keyof P = never> = {
  readonly [K in Exclude<keyof P, C>]-?: ReadonlySignal<P[K]>;
} & Pick<P, C>;

export type MaybeSignal<T> = T | ReadonlySignal<T>;

/** Props a zudo-react caller may pass either as plain values or as signals. */
export type Reactive<P, C extends keyof P = never> = {
  [K in keyof P as K extends C ? never : K]: MaybeSignal<P[K]>;
} & Pick<P, C>;

export function isSignal(value: unknown): value is ReadonlySignal<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { $$zudoReactive?: unknown }).$$zudoReactive === 'zudo-react.reactive.v1'
  );
}

/** Read the current value, tracking it when called inside a computed/effect. */
export function read<T>(value: MaybeSignal<T>): T {
  return isSignal(value) ? (value as ReadonlySignal<T>).value : (value as T);
}

/** Normalise a plain-or-signal prop to a signal. */
export function toSignal<T>(value: MaybeSignal<T>): ReadonlySignal<T> {
  return isSignal(value) ? (value as ReadonlySignal<T>) : computed(() => value as T);
}
