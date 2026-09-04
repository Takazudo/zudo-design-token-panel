// @vitest-environment browser

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRef, render } from 'preact';
import { act } from 'preact/test-utils';
import {
  AltClickPicker,
  type AltClickPickerClassNames,
  type AltClickPickerHandle,
} from '../alt-click-picker';
import { __resetArmingCoordinatorForTests } from '../arming-coordinator';

const PICKER_CLASS_NAMES: AltClickPickerClassNames = {
  box: 'test-picker-box',
  label: 'test-picker-label',
  labelName: 'test-picker-label-name',
  labelSize: 'test-picker-label-size',
  inspectingRoot: 'test-picker-inspecting',
};

let container: HTMLDivElement;
let createdElements: HTMLElement[] = [];

async function flushEffects(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

function createFixedElement(opts: {
  id: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  className?: string;
  zIndex?: number;
}): HTMLDivElement {
  const el = document.createElement('div');
  el.id = opts.id;
  if (opts.className) el.className = opts.className;
  el.textContent = opts.id;
  Object.assign(el.style, {
    position: 'fixed',
    left: `${opts.left ?? 40}px`,
    top: `${opts.top ?? 50}px`,
    width: `${opts.width ?? 120}px`,
    height: `${opts.height ?? 60}px`,
    background: 'rgb(10 100 200)',
    zIndex: String(opts.zIndex ?? 1),
  });
  document.body.appendChild(el);
  createdElements.push(el);
  return el;
}

function renderPicker(onElementPicked = vi.fn(), enabled = true): ReturnType<typeof vi.fn> {
  act(() => {
    render(
      <AltClickPicker
        enabled={enabled}
        featureId="test-picker"
        onElementPicked={onElementPicked}
        getLabelText={(el) => el.id || el.tagName.toLowerCase()}
        classNames={PICKER_CLASS_NAMES}
        zIndex={2147483000}
      />,
      container,
    );
  });
  return onElementPicked;
}

function movePointerTo(x: number, y: number): void {
  document.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: x,
      clientY: y,
    }),
  );
}

function pressAlt(): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Alt',
      altKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function releaseAlt(): void {
  window.dispatchEvent(
    new KeyboardEvent('keyup', {
      key: 'Alt',
      altKey: false,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function clickAt(el: Element, x: number, y: number): void {
  el.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
  el.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}

beforeEach(() => {
  __resetArmingCoordinatorForTests();
  document.documentElement.classList.remove(PICKER_CLASS_NAMES.inspectingRoot);
  createdElements = [];
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(async () => {
  await flushEffects();
  act(() => {
    render(null, container);
  });
  container.remove();
  for (const el of createdElements) el.remove();
  createdElements = [];
  document.documentElement.classList.remove(PICKER_CLASS_NAMES.inspectingRoot);
  __resetArmingCoordinatorForTests();
});

describe('AltClickPicker', () => {
  it('can be armed and disarmed through its imperative API', async () => {
    createFixedElement({ id: 'programmatic-target' });
    const pickerRef = createRef<AltClickPickerHandle>();
    act(() => {
      render(
        <AltClickPicker
          ref={pickerRef}
          enabled
          featureId="test-picker"
          onElementPicked={vi.fn()}
          classNames={PICKER_CLASS_NAMES}
        />,
        container,
      );
    });
    await flushEffects();
    act(() => movePointerTo(60, 70));

    act(() => pickerRef.current?.arm());
    expect(document.querySelector('.test-picker-box')).not.toBeNull();

    act(() => releaseAlt());
    expect(document.querySelector('.test-picker-box')).not.toBeNull();

    act(() => pickerRef.current?.disarm());
    expect(document.querySelector('.test-picker-box')).toBeNull();
  });

  it('arms and shows a box over the hovered host element', async () => {
    const target = createFixedElement({ id: 'host-card' });
    renderPicker();
    await flushEffects();

    expect(document.elementFromPoint(60, 70)).toBe(target);
    expect(document.querySelector('.test-picker-box')).toBeNull();

    act(() => {
      movePointerTo(60, 70);
      pressAlt();
    });

    const box = document.querySelector<HTMLElement>('.test-picker-box');
    const label = document.querySelector<HTMLElement>('.test-picker-label');
    expect(box).not.toBeNull();
    expect(label?.textContent).toContain('host-card');
    expect(box?.style.left).toBe('40px');
    expect(box?.style.top).toBe('50px');
    expect(box?.style.width).toBe('120px');
    expect(box?.style.height).toBe('60px');
    expect(document.documentElement.classList.contains(PICKER_CLASS_NAMES.inspectingRoot)).toBe(true);
  });

  it('Alt-click fires onElementPicked with the host element', async () => {
    const target = createFixedElement({ id: 'pick-me' });
    const onElementPicked = renderPicker();
    await flushEffects();

    act(() => {
      movePointerTo(60, 70);
      pressAlt();
    });
    await flushEffects();

    act(() => {
      clickAt(target, 60, 70);
    });

    expect(onElementPicked).toHaveBeenCalledTimes(1);
    expect(onElementPicked).toHaveBeenCalledWith(target);
  });

  it('never picks panel-owned portal elements', async () => {
    const host = createFixedElement({ id: 'covered-host', zIndex: 1 });
    const panel = createFixedElement({
      id: 'tokenpanel-domtweaker-mount',
      zIndex: 2,
    });
    const onElementPicked = renderPicker();
    await flushEffects();

    expect(document.elementFromPoint(60, 70)).toBe(panel);
    expect(host.isConnected).toBe(true);

    act(() => {
      movePointerTo(60, 70);
      pressAlt();
    });
    await flushEffects();

    expect(document.querySelector('.test-picker-box')).toBeNull();

    act(() => {
      clickAt(panel, 60, 70);
    });

    expect(onElementPicked).not.toHaveBeenCalled();
  });

  it('disarms on Alt keyup and window blur', async () => {
    createFixedElement({ id: 'host-card' });
    renderPicker();
    await flushEffects();

    act(() => {
      movePointerTo(60, 70);
      pressAlt();
    });
    expect(document.querySelector('.test-picker-box')).not.toBeNull();
    expect(document.documentElement.classList.contains(PICKER_CLASS_NAMES.inspectingRoot)).toBe(true);

    act(() => {
      releaseAlt();
    });
    expect(document.querySelector('.test-picker-box')).toBeNull();
    expect(document.documentElement.classList.contains(PICKER_CLASS_NAMES.inspectingRoot)).toBe(false);

    act(() => {
      pressAlt();
    });
    expect(document.querySelector('.test-picker-box')).not.toBeNull();
    expect(document.documentElement.classList.contains(PICKER_CLASS_NAMES.inspectingRoot)).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(document.querySelector('.test-picker-box')).toBeNull();
    expect(document.documentElement.classList.contains(PICKER_CLASS_NAMES.inspectingRoot)).toBe(false);
  });
});
