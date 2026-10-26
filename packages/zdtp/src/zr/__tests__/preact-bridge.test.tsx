// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from '../test-utils';
import { bridgeToPreact } from '../preact-bridge';
import { settle } from '../test-utils';
import { Widget, widgetCleanups, type WidgetProps } from './zr-widget';

const BridgedWidget = bridgeToPreact<WidgetProps, 'onPick'>(Widget, {
  signals: ['label', 'count'],
  callbacks: ['onPick'],
});

let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  widgetCleanups.length = 0;
});
afterEach(() => {
  act(() => render(null, container));
  container.remove();
});

describe('bridgeToPreact', () => {
  it('mounts synchronously inside the Preact commit without island markers', () => {
    act(() => render(<section><BridgedWidget label="a" count={1} onPick={() => {}} /></section>, container));
    const widget = container.querySelector('.widget')!;
    expect(widget.textContent).toBe('a × 1');
    const host = container.querySelector('.tokenpanel-zr-host') as HTMLElement;
    expect(host.style.display).toBe('contents');
    expect(container.querySelector('[data-zfb-island-skip-ssr],[data-zfb-build]')).toBeNull();
  });

  it('delivers later Preact props as signal updates on the next flush', async () => {
    act(() => render(<BridgedWidget label="a" count={1} onPick={() => {}} />, container));
    const widget = container.querySelector('.widget')!;
    act(() => render(<BridgedWidget label="b" count={2} onPick={() => {}} />, container));
    await settle();
    expect(container.querySelector('.widget')).toBe(widget);
    expect(widget.textContent).toBe('b × 2');
    expect(widget.getAttribute('data-count')).toBe('2');
  });

  it('routes callbacks to the latest Preact prop', () => {
    const first = vi.fn();
    const second = vi.fn();
    act(() => render(<BridgedWidget label="a" count={1} onPick={first} />, container));
    act(() => render(<BridgedWidget label="a" count={1} onPick={second} />, container));
    (container.querySelector('.widget') as HTMLElement).click();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('a');
  });

  it('keeps zudo-react DOM across unrelated parent re-renders and disposes on unmount', () => {
    act(() => render(<div title="x"><BridgedWidget label="a" count={1} onPick={() => {}} /></div>, container));
    const widget = container.querySelector('.widget');
    act(() => render(<div title="y"><BridgedWidget label="a" count={1} onPick={() => {}} /></div>, container));
    expect(container.querySelector('.widget')).toBe(widget);
    act(() => render(<div title="y" />, container));
    expect(container.querySelector('.widget')).toBeNull();
    expect(widgetCleanups).toEqual(['a']);
  });
});
