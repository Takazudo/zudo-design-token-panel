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
import type { JSX } from 'preact';
import { TokenLabel } from '../controls/token-label';
import { TooltipProvider, useTooltip } from '../controls/tooltip';
import { flushEffects } from './_test-helpers';

// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

const LONG_TOOLTIP_TEXT = '--tooltip-' + 'x'.repeat(4000);

let container: HTMLDivElement;
let panelStyle: HTMLStyleElement;

function TooltipFixture(): JSX.Element {
  const boxTooltip = useTooltip('box trigger tooltip');
  const longTooltip = useTooltip(LONG_TOOLTIP_TEXT);

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

function getVisibleTextExtent(label: HTMLElement): { left: number; right: number } {
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

  it('hides the shared tooltip when its current trigger leaves', async () => {
    const trigger = getTrigger('box-trigger');
    await hover(trigger);
    await leave(trigger);
    expect(getTooltip().getAttribute('data-show')).toBe('false');
  });
});
