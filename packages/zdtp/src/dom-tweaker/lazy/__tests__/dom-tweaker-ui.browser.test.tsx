// @vitest-environment browser

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { PanelConfig } from '../../../config/panel-config';
import { __resetDismissLayersForTests } from '../../../controls/dismiss-layer';
import {
  EditIconButton,
  PinnedSelectionOverlay,
} from '../pinned-selection-overlay';
import { ClassEditorPopup } from '../class-editor-popup';
import { DiffExportModal } from '../diff-export-modal';
import { DOM_TWEAKER_STYLE_ID } from '../style-injection';

let container: HTMLDivElement | null = null;
let createdElements: HTMLElement[] = [];

function ensureContainer(): HTMLDivElement {
  container = document.createElement('div');
  document.body.append(container);
  return container;
}

function createFixedElement({
  left = 40,
  top = 50,
  width = 120,
  height = 60,
}: {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
} = {}): HTMLElement {
  const el = document.createElement('div');
  el.textContent = 'host target';
  el.style.cssText = [
    'position:fixed',
    `left:${left}px`,
    `top:${top}px`,
    `width:${width}px`,
    `height:${height}px`,
    'background:rgb(255 0 0)',
  ].join(';');
  document.body.append(el);
  createdElements.push(el);
  return el;
}

async function frame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function inputText(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function key(target: Element, keyName: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: keyName,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function testConfig(): PanelConfig {
  return {
    storagePrefix: 'domtweak-ui-test',
    consoleNamespace: 'domtweakUiTest',
    modalClassPrefix: 'zudo-design-token-panel-modal',
    schemaId: 'domtweak-ui-test/v1',
    exportFilenameBase: 'domtweak-ui-test',
    tabs: [],
  };
}

afterEach(() => {
  if (container) {
    render(null, container);
    container.remove();
    container = null;
  }
  for (const el of createdElements) el.remove();
  createdElements = [];
  document.getElementById(DOM_TWEAKER_STYLE_ID)?.remove();
  __resetDismissLayersForTests();
});

describe('DOM Tweaker lazy UI', () => {
  it('injects lazy CSS and tracks pinned box/edit icon geometry until disconnect', async () => {
    const target = createFixedElement();
    const onOpenEditor = vi.fn();
    const onTargetDisconnected = vi.fn();

    expect(document.getElementById(DOM_TWEAKER_STYLE_ID)).toBeNull();

    act(() => {
      render(
        <>
          <PinnedSelectionOverlay
            target={target}
            onTargetDisconnected={onTargetDisconnected}
          />
          <EditIconButton target={target} onOpenEditor={onOpenEditor} />
        </>,
        ensureContainer(),
      );
    });
    await frame();

    expect(document.getElementById(DOM_TWEAKER_STYLE_ID)).not.toBeNull();
    const box = document.querySelector<HTMLElement>('.tokenpanel-domtweaker-pinned-box');
    const button = document.querySelector<HTMLElement>('.tokenpanel-domtweaker-edit-button');
    expect(box?.style.left).toBe('40px');
    expect(box?.style.top).toBe('50px');
    expect(box?.style.width).toBe('120px');
    expect(box?.style.height).toBe('60px');
    expect(button?.style.left).toBe('150px');
    expect(button?.style.top).toBe('36px');

    act(() => {
      button!.click();
    });
    expect(onOpenEditor).toHaveBeenCalledTimes(1);

    target.style.left = '80px';
    target.style.top = '90px';
    await frame();

    expect(box?.style.left).toBe('80px');
    expect(box?.style.top).toBe('90px');
    expect(button?.style.left).toBe('190px');
    expect(button?.style.top).toBe('76px');

    target.remove();
    await frame();

    expect(document.querySelector('.tokenpanel-domtweaker-pinned-box')).toBeNull();
    expect(document.querySelector('.tokenpanel-domtweaker-edit-button')).toBeNull();
    expect(onTargetDisconnected).toHaveBeenCalledTimes(1);
  });

  it('renders class chips, filters suggestions, supports keyboard/raw entry, clamps, and dismisses', async () => {
    const target = createFixedElement({ left: 1180, top: 700, width: 80, height: 40 });
    const onAddClass = vi.fn();
    const onRemoveClass = vi.fn();
    const onClose = vi.fn();

    act(() => {
      render(
        <ClassEditorPopup
          target={target}
          selectorSummary="div#card.px-2.rounded-md"
          currentClasses={['px-2', 'rounded-md']}
          suggestions={['px-2', 'px-24', 'py-1']}
          onAddClass={onAddClass}
          onRemoveClass={onRemoveClass}
          onClose={onClose}
        />,
        ensureContainer(),
      );
    });
    await frame();

    const popover = document.querySelector<HTMLElement>('.tokenpanel-domtweaker-popover');
    expect(popover?.style.left).toBe('952px');
    expect(popover?.style.top).toBe('392px');
    expect(popover?.textContent).toContain('div#card.px-2.rounded-md');
    expect(popover?.textContent).toContain('rounded-md');

    const removeRounded = popover!.querySelector<HTMLElement>(
      '[aria-label="Remove rounded-md"]',
    );
    act(() => {
      removeRounded!.click();
    });
    expect(onRemoveClass).toHaveBeenCalledWith('rounded-md');

    const input = popover!.querySelector<HTMLInputElement>('input')!;
    act(() => {
      inputText(input, 'px');
    });
    await frame();
    expect(popover!.querySelector('[role="listbox"]')).not.toBeNull();
    expect(
      Array.from(popover!.querySelectorAll('[role="option"]')).map(
        (option) => option.textContent,
      ),
    ).toEqual(['px-2', 'px-24']);

    act(() => {
      key(input, 'ArrowDown');
    });
    await frame();
    expect(popover!.querySelector('[role="option"]')?.getAttribute('aria-selected')).toBe(
      'true',
    );

    act(() => {
      key(input, 'Enter');
    });
    expect(onAddClass).toHaveBeenCalledWith('px-2');
    await frame();

    act(() => {
      inputText(input, 'custom-class');
    });
    await frame();

    act(() => {
      key(input, 'Enter');
    });
    expect(onAddClass).toHaveBeenCalledWith('custom-class');

    act(() => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the class editor on Escape', async () => {
    const target = createFixedElement();
    const onClose = vi.fn();

    act(() => {
      render(
        <ClassEditorPopup
          target={target}
          selectorSummary="div#card"
          currentClasses={[]}
          suggestions={[]}
          onAddClass={() => undefined}
          onRemoveClass={() => undefined}
          onClose={onClose}
        />,
        ensureContainer(),
      );
    });
    await frame();

    const input = document.querySelector<HTMLInputElement>(
      '.tokenpanel-domtweaker-popover__input',
    )!;
    act(() => {
      key(input, 'Escape');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the diff export modal and fires copy/reset/close callbacks', async () => {
    const onCopy = vi.fn(async () => undefined);
    const onResetAll = vi.fn();
    const onClose = vi.fn();

    act(() => {
      render(
        <DiffExportModal
          diffText={'selector: #card\nbefore: "px-2"\nafter: "px-24"'}
          onCopy={onCopy}
          onResetAll={onResetAll}
          onClose={onClose}
          instanceConfig={testConfig()}
        />,
        ensureContainer(),
      );
    });
    await frame();

    const dialog = document.querySelector<HTMLDialogElement>(
      '[data-design-token-panel-modal-variant="dom-tweaker-diff"]',
    )!;
    expect(dialog.open).toBe(true);
    expect(document.activeElement?.textContent).toBe('Copy');
    expect(dialog.querySelector('textarea')?.value).toContain('selector: #card');

    const buttons = Array.from(dialog.querySelectorAll<HTMLElement>('[role="button"]'));
    act(() => {
      buttons.find((button) => button.textContent === 'Copy')!.click();
    });
    await Promise.resolve();
    expect(onCopy).toHaveBeenCalledWith(
      'selector: #card\nbefore: "px-2"\nafter: "px-24"',
    );

    act(() => {
      buttons.find((button) => button.textContent === 'Reset all')!.click();
    });
    expect(onResetAll).toHaveBeenCalledTimes(1);

    act(() => {
      buttons.find((button) => button.textContent === 'Close')!.click();
    });
    await Promise.resolve();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
