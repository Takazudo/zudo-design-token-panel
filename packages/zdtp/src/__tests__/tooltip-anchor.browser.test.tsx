// @vitest-environment browser

/**
 * Browser-mode coverage for tooltip geometry.
 *
 * The text anchor is opt-in because most tooltip triggers are already sized
 * to their visible chrome. TokenLabel is the one trigger whose flex item can
 * be much wider than its text, so its tooltip should follow the displayed
 * text area while ordinary triggers should remain centred on their boxes.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { TokenLabel } from '../controls/token-label';
import { TooltipProvider, useTooltip } from '../controls/tooltip';
import { flushEffects } from './_test-helpers';

// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

const LONG_TOOLTIP_TEXT = '--tooltip-' + 'x'.repeat(4000);
const TRUNCATED_TOKEN = '--zfb-radius-super-extraordinarily-long-token-name-for-truncated-label';

let container: HTMLDivElement;
let panelStyle: HTMLStyleElement;

function TooltipFixture(): JSX.Element {
  const boxTooltip = useTooltip('box trigger tooltip');
  const longTooltip = useTooltip(LONG_TOOLTIP_TEXT);
  const [reusedText, setReusedText] = useState('short tooltip near the right edge');
  const reusedTooltip = useTooltip(reusedText);

  return (
    <>
      <div
        data-testid="text-anchor-row"
        className="tokenpanel-row"
        style={{
          position: 'fixed',
          left: '300px',
          top: '200px',
          width: '900px',
          height: '30px',
        }}
      >
        <TokenLabel cssVar="--zfb-radius-md" />
        <span style={{ flex: '0 0 450px' }}>trailing content</span>
      </div>

      <div
        data-testid="truncated-text-anchor-row"
        className="tokenpanel-row"
        style={{
          position: 'fixed',
          left: '300px',
          top: '0px',
          width: '500px',
          height: '32px',
        }}
      >
        <TokenLabel cssVar={TRUNCATED_TOKEN} label="Radius medium" />
        <span style={{ flex: '0 0 180px' }}>trailing content</span>
      </div>

      <div
        data-testid="box-trigger"
        style={{
          position: 'fixed',
          left: '650px',
          top: '300px',
          width: '180px',
          height: '24px',
        }}
        {...boxTooltip}
      >
        box trigger
      </div>

      <div
        data-testid="long-trigger"
        style={{
          position: 'fixed',
          left: '20px',
          top: '0px',
          width: '100px',
          height: '780px',
        }}
        {...longTooltip}
      >
        long trigger
      </div>

      <div
        data-testid="reused-trigger"
        style={{
          position: 'fixed',
          left: '1120px',
          top: '300px',
          width: '100px',
          height: '24px',
        }}
        onClick={() => setReusedText(LONG_TOOLTIP_TEXT)}
        {...reusedTooltip}
      >
        reused trigger
      </div>
    </>
  );
}

function getTrigger(testId: string): HTMLElement {
  const trigger = container.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!trigger) throw new Error(`missing ${testId}`);
  return trigger;
}

function getTooltip(): HTMLElement {
  const tooltip = document.querySelector<HTMLElement>('.tokenpanel-tooltip');
  if (!tooltip) throw new Error('.tokenpanel-tooltip not found');
  return tooltip;
}

function getVisibleTextExtent(label: HTMLElement): {
  left: number;
  right: number;
  rawRight: number;
} {
  const textNode = Array.from(label.childNodes).find((node): node is Text => node.nodeType === 3);
  if (!textNode) throw new Error('TokenLabel text node not found');

  const range = document.createRange();
  range.selectNodeContents(textNode);
  const textRect = range.getBoundingClientRect();
  const labelRect = label.getBoundingClientRect();
  const clientLeft = labelRect.left + label.clientLeft;
  const clientRight = clientLeft + label.clientWidth;
  return {
    left: Math.max(textRect.left, clientLeft),
    right: Math.min(textRect.right, clientRight),
    rawRight: textRect.right,
  };
}

async function hover(trigger: HTMLElement): Promise<void> {
  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  });
  await flushEffects();
}

async function leave(trigger: HTMLElement): Promise<void> {
  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  });
  await flushEffects();
}

beforeEach(async () => {
  document.body.innerHTML = '';
  panelStyle = document.createElement('style');
  panelStyle.textContent = ((await panelCssModule) as { default: string }).default;
  document.head.appendChild(panelStyle);

  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    render(
      <TooltipProvider>
        <TooltipFixture />
      </TooltipProvider>,
      container,
    );
  });
  await flushEffects();
});

afterEach(async () => {
  await flushEffects();
  act(() => render(null, container));
  container.remove();
  panelStyle.remove();
});

describe('tooltip geometry', () => {
  it('anchors TokenLabel to the displayed text area', async () => {
    const row = getTrigger('text-anchor-row');
    const label = row.querySelector<HTMLElement>('.tokenpanel-row-label');
    if (!label) throw new Error('.tokenpanel-row-label not found');

    await hover(label);

    const textExtent = getVisibleTextExtent(label);
    const tooltipRect = getTooltip().getBoundingClientRect();
    const textCenter = (textExtent.left + textExtent.right) / 2;
    const tooltipCenter = (tooltipRect.left + tooltipRect.right) / 2;

    expect(tooltipRect.left).toBeLessThan(textExtent.right);
    expect(tooltipRect.right).toBeGreaterThan(textExtent.left);
    expect(Math.abs(tooltipCenter - textCenter)).toBeLessThanOrEqual(24);
  });

  it('anchors a truncated TokenLabel to its visible text and keeps vertical placement on the full trigger', async () => {
    const row = getTrigger('truncated-text-anchor-row');
    const label = row.querySelector<HTMLElement>('.tokenpanel-row-label');
    if (!label) throw new Error('.tokenpanel-row-label not found');

    await hover(label);

    const textExtent = getVisibleTextExtent(label);
    const labelRect = label.getBoundingClientRect();
    const tooltipRect = getTooltip().getBoundingClientRect();
    const textCenter = (textExtent.left + textExtent.right) / 2;
    const tooltipCenter = (tooltipRect.left + tooltipRect.right) / 2;

    expect(textExtent.rawRight).toBeGreaterThan(labelRect.left + label.clientWidth);
    expect(tooltipRect.left).toBeLessThan(textExtent.right);
    expect(tooltipRect.right).toBeGreaterThan(textExtent.left);
    expect(Math.abs(tooltipCenter - textCenter)).toBeLessThanOrEqual(24);

    // The row starts at the viewport edge, so the tooltip must flip below.
    // Use the label's full border box here: its sub-label makes this measurably
    // taller than the first text node and catches accidental vertical anchoring
    // to the Range as well.
    expect(Math.abs(tooltipRect.top - labelRect.bottom - 6)).toBeLessThanOrEqual(3);
  });

  it('keeps ordinary triggers centred on their border boxes', async () => {
    const trigger = getTrigger('box-trigger');
    await hover(trigger);

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = getTooltip().getBoundingClientRect();
    const triggerCenter = (triggerRect.left + triggerRect.right) / 2;
    const tooltipCenter = (tooltipRect.left + tooltipRect.right) / 2;

    expect(Math.abs(tooltipCenter - triggerCenter)).toBeLessThanOrEqual(1);
  });

  it('wraps long text and clamps a flipped tooltip to the viewport bottom', async () => {
    const trigger = getTrigger('long-trigger');
    await hover(trigger);

    const tooltipRect = getTooltip().getBoundingClientRect();
    const viewportPadding = 6;
    expect(tooltipRect.width).toBeLessThanOrEqual(window.innerWidth - viewportPadding * 2 + 1);
    expect(tooltipRect.height).toBeGreaterThan(25);
    expect(tooltipRect.bottom).toBeLessThanOrEqual(window.innerHeight - viewportPadding + 1);
  });

  it('re-measures a long tooltip after a short right-edge tooltip on the same trigger', async () => {
    const trigger = getTrigger('reused-trigger');
    await hover(trigger);
    const shortTooltipRect = getTooltip().getBoundingClientRect();
    expect(shortTooltipRect.left).toBeGreaterThan(window.innerWidth / 2);
    expect(shortTooltipRect.right).toBeLessThanOrEqual(window.innerWidth - 6 + 1);

    await leave(trigger);
    act(() => {
      trigger.click();
    });
    await flushEffects();
    await hover(trigger);

    const longTooltipRect = getTooltip().getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    expect(longTooltipRect.width).toBeGreaterThan(window.innerWidth - 24);
    expect(longTooltipRect.left).toBeGreaterThanOrEqual(6 - 1);
    expect(longTooltipRect.right).toBeLessThanOrEqual(window.innerWidth - 6 + 1);
    expect(longTooltipRect.top).toBeGreaterThanOrEqual(6 - 1);
    expect(longTooltipRect.bottom).toBeLessThanOrEqual(window.innerHeight - 6 + 1);

    const isAboveTrigger = Math.abs(longTooltipRect.bottom - triggerRect.top) <= 10;
    const isBelowTrigger = Math.abs(longTooltipRect.top - triggerRect.bottom) <= 10;
    expect(isAboveTrigger || isBelowTrigger).toBe(true);
  });

  it('hides the shared tooltip when its current trigger leaves', async () => {
    const trigger = getTrigger('box-trigger');
    await hover(trigger);
    await leave(trigger);
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });
});
