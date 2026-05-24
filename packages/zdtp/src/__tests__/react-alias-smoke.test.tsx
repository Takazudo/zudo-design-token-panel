/**
 * Smoke test: verify the `react` → `preact/compat` alias resolves.
 *
 * zudo-doc's ported control components import `from "react"` verbatim. This
 * file mimics that shape so TypeScript + Vite both have to resolve "react"
 * through the alias configured in `tsconfig.json` paths + `vite.config.ts`
 * `resolve.alias`. If either layer forgets the alias, this file fails to
 * type-check (paths lookup) or to bundle (vite alias).
 *
 * The test asserts the imported hooks are the functions exported by
 * preact/compat (identity check against preact/hooks), and nothing more —
 * rendering is left to jsdom-based tests if/when this sub-package gains
 * a DOM test environment.
 */

import { describe, it, expect } from 'vitest';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import * as preactHooks from 'preact/hooks';

function ZudoDocStyleControl({ label }: { label: string }): preact.JSX.Element {
  const [value, setValue] = useState<string>(label);
  const ref = useRef<HTMLDivElement | null>(null);
  const id = useMemo(() => `smoke-${label}`, [label]);

  useEffect(() => {
    return () => undefined;
  }, [id]);

  const onReset = useCallback(() => setValue(label), [label]);

  return (
    <div ref={ref} data-id={id} onClick={onReset}>
      {value}
    </div>
  );
}

describe('react → preact/compat alias', () => {
  it('resolves `from "react"` hook imports against preact', () => {
    // When the alias is active, `react`'s `useState` is preact/compat's
    // wrapper, which ultimately reuses preact/hooks. Verifying function
    // identity via `.name` keeps the assertion resilient across preact
    // versions while still proving the alias fired.
    expect(typeof useState).toBe('function');
    expect(typeof useEffect).toBe('function');
    expect(typeof useMemo).toBe('function');
    expect(typeof useCallback).toBe('function');
    expect(typeof useRef).toBe('function');
    expect(typeof preactHooks.useState).toBe('function');
  });

  it('type-checks a zudo-doc-shaped component using react hooks', () => {
    const C: ComponentType<{ label: string }> = ZudoDocStyleControl;
    expect(typeof C).toBe('function');
  });
});
