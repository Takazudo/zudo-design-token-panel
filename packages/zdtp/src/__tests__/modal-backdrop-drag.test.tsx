// @vitest-environment jsdom

/**
 * Modal backdrop dismissal is gesture-aware (#446 F14).
 *
 * A press+release that BOTH land on the backdrop dismisses the modal; a
 * selection drag that STARTS inside the dialog (over the export JSON / import
 * textarea) and ends on the backdrop must NOT — otherwise unsaved input is lost.
 *
 * jsdom 25 does not implement <dialog>.showModal()/close(); we polyfill both on
 * the prototype (close() dispatches the native `close` event so the modal's
 * close listener → onClose fires), mirroring panel-close-storage-sync.test.tsx.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { ExportModal } from '../export-modal';
import { ImportModal } from '../import-modal';
import { __resetPanelConfigForTests } from '../config/panel-config';
import { installFixturePanelConfig, FIXTURE_CLUSTER } from './_test-helpers';

let container: HTMLDivElement;

const RECT = {
  left: 100,
  top: 100,
  right: 400,
  bottom: 400,
  width: 300,
  height: 300,
  x: 100,
  y: 100,
  toJSON() {},
} as DOMRect;

function colorState() {
  const palette = Array.from({ length: FIXTURE_CLUSTER.paletteSize }, () => '#000000');
  return {
    palette,
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
    semanticMappings: { accent: 6, muted: 8, active: 14 },
    shikiTheme: 'dracula' as const,
  };
}

function fullState() {
  return { color: colorState(), spacing: {}, typography: {}, size: {} };
}

function dialogEl(): HTMLDialogElement {
  const d = container.querySelector('dialog') as HTMLDialogElement;
  d.getBoundingClientRect = () => RECT;
  return d;
}

/** press + release at the SAME point. */
function clickAt(d: HTMLElement, x: number, y: number): void {
  act(() => {
    d.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
    d.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  });
}

/** press at (downX,downY), release/click at (upX,upY) — a drag gesture. */
function dragAndRelease(
  d: HTMLElement,
  downX: number,
  downY: number,
  upX: number,
  upY: number,
): void {
  act(() => {
    d.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: downX, clientY: downY }));
    d.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: upX, clientY: upY }));
  });
}

beforeEach(() => {
  installFixturePanelConfig();
  container = document.createElement('div');
  document.body.appendChild(container);
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  __resetPanelConfigForTests();
  delete (HTMLDialogElement.prototype as { showModal?: unknown }).showModal;
  delete (HTMLDialogElement.prototype as { close?: unknown }).close;
  vi.restoreAllMocks();
});

describe('ExportModal — gesture-aware backdrop close (F14)', () => {
  it('a genuine backdrop click (press+release outside) closes the modal', () => {
    const onClose = vi.fn();
    act(() => {
      render(<ExportModal onClose={onClose} state={fullState()} colorDefaults={colorState()} />, container);
    });
    clickAt(dialogEl(), 5, 5);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('a selection drag that starts inside and ends on the backdrop does NOT close', () => {
    const onClose = vi.fn();
    act(() => {
      render(<ExportModal onClose={onClose} state={fullState()} colorDefaults={colorState()} />, container);
    });
    // mousedown inside the dialog rect (200,200), release on the backdrop (5,5).
    dragAndRelease(dialogEl(), 200, 200, 5, 5);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a click that starts and ends inside the dialog does NOT close', () => {
    const onClose = vi.fn();
    act(() => {
      render(<ExportModal onClose={onClose} state={fullState()} colorDefaults={colorState()} />, container);
    });
    clickAt(dialogEl(), 200, 200);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ImportModal — gesture-aware backdrop close (F14)', () => {
  it('a genuine backdrop click closes the modal', () => {
    const onClose = vi.fn();
    act(() => {
      render(<ImportModal onClose={onClose} onLoad={vi.fn()} colorDefaults={colorState()} />, container);
    });
    clickAt(dialogEl(), 5, 5);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('a selection drag starting in the textarea and ending on the backdrop does NOT close (pasted JSON preserved)', () => {
    const onClose = vi.fn();
    act(() => {
      render(<ImportModal onClose={onClose} onLoad={vi.fn()} colorDefaults={colorState()} />, container);
    });
    dragAndRelease(dialogEl(), 200, 200, 5, 5);
    expect(onClose).not.toHaveBeenCalled();
  });
});
