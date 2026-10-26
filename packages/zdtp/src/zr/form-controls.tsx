/** @jsxImportSource @takazudo/zfb/zudo-react */
import { getScope, type Child } from '@takazudo/zfb/zudo-react';
import { read, type MaybeSignal } from './live';

type Attr = MaybeSignal<string | number | boolean | null> | undefined;

export interface CheckboxProps {
  checked: MaybeSignal<boolean>;
  indeterminate?: MaybeSignal<boolean>;
  disabled?: MaybeSignal<boolean>;
  onChange: (checked: boolean) => void;
  class?: string;
  'aria-label'?: Attr;
  'data-testid'?: string;
}

/**
 * A checkbox whose checked state follows a signal. zudo-react's
 * `modelChecked` is two-way; the panel's checkboxes are controlled by their
 * owner, so the DOM property is written from an effect instead.
 */
export function Checkbox(props: CheckboxProps) {
  const input: { current: HTMLInputElement | null } = { current: null };
  getScope().effect(() => {
    const checked = read(props.checked);
    const indeterminate = read(props.indeterminate) ?? false;
    if (!input.current) return;
    input.current.checked = checked;
    input.current.indeterminate = indeterminate;
  });
  return (
    <input
      ref={input}
      type="checkbox"
      class={props.class ?? null}
      disabled={props.disabled ?? false}
      aria-label={props['aria-label'] ?? null}
      data-testid={props['data-testid'] ?? null}
      on:change={(event) => props.onChange((event.currentTarget as HTMLInputElement).checked)}
    />
  );
}

export interface ControlledSelectProps {
  value: MaybeSignal<string>;
  onChange: (value: string) => void;
  disabled?: MaybeSignal<boolean>;
  class?: string;
  'aria-label'?: Attr;
  children?: Child;
}

/** A `<select>` whose selection follows a signal (see `Checkbox`). */
export function ControlledSelect(props: ControlledSelectProps) {
  const select: { current: HTMLSelectElement | null } = { current: null };
  getScope().effect(() => {
    const value = read(props.value);
    const apply = () => {
      if (select.current && select.current.value !== value) select.current.value = value;
    };
    apply();
    // An option rendered in the same flush may not exist yet.
    queueMicrotask(apply);
  });
  return (
    <select
      ref={select}
      class={props.class ?? null}
      disabled={props.disabled ?? false}
      aria-label={props['aria-label'] ?? null}
      on:change={(event) => props.onChange((event.currentTarget as HTMLSelectElement).value)}
    >
      {props.children}
    </select>
  );
}

export interface TextInputProps {
  value: MaybeSignal<string>;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  type?: 'text' | 'color' | 'range' | 'number';
  disabled?: MaybeSignal<boolean>;
  /** Further plain attributes (aria-*, data-*, inputmode, placeholder, …). */
  attrs?: Record<string, MaybeSignal<string | number | boolean | null>>;
  /** Static attributes outside zudo-react's vocabulary (e.g. `autocorrect`), set on activation. */
  rawAttrs?: Record<string, string>;
  class?: MaybeSignal<string>;
}

/**
 * A text-like input whose value follows a signal (see `Checkbox`). The DOM
 * value is only written when it differs, so typing is never clobbered by its
 * own echo.
 */
export function TextInput(props: TextInputProps) {
  const input: { current: HTMLInputElement | null } = { current: null };
  const scope = getScope();
  scope.onActivate(() => {
    for (const [name, value] of Object.entries(props.rawAttrs ?? {})) input.current?.setAttribute(name, value);
  });
  scope.effect(() => {
    const value = read(props.value);
    if (input.current && input.current.value !== value) input.current.value = value;
  });
  const valueOf = (event: Event) => (event.currentTarget as HTMLInputElement).value;
  return (
    <input
      ref={input}
      type={props.type ?? 'text'}
      class={props.class ?? null}
      disabled={props.disabled ?? false}
      {...(props.attrs as Record<string, string>)}
      {...(props.onInput ? { 'on:input': (event: Event) => props.onInput!(valueOf(event)) } : {})}
      {...(props.onChange ? { 'on:change': (event: Event) => props.onChange!(valueOf(event)) } : {})}
      {...(props.onBlur ? { 'on:blur': () => props.onBlur!() } : {})}
      {...(props.onKeyDown ? { 'on:keydown': (event: KeyboardEvent) => props.onKeyDown!(event) } : {})}
    />
  );
}
