import { staticCssColorToOklcha } from './color-oklch';

/** Whether a color needs browser evaluation instead of static parsing. */
export function isCssExpression(value: string): boolean {
  const trimmed = value.trim();
  return /^(?:var|light-dark|color-mix|env|calc)\(/i.test(trimmed)
    || (trimmed.includes('(') && staticCssColorToOklcha(trimmed) === null);
}

const SENTINEL = 'rgb(1, 2, 3)';
const SECOND_SENTINEL = 'rgb(4, 5, 6)';
let wrapper: HTMLDivElement | undefined;
let probe: HTMLDivElement | undefined;

function createHiddenDiv(): HTMLDivElement {
  const element = document.createElement('div');
  // Inline important declarations keep global host div rules, animations and
  // transitions from changing either the measurement or the hidden footprint.
  // `all` does not reset custom properties, which must inherit from the host.
  element.style.cssText = `all: initial !important;
    position: absolute !important; width: 0 !important; height: 0 !important;
    visibility: hidden !important; pointer-events: none !important;
    color-scheme: inherit !important;`;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

/**
 * Resolve a color in the document-root/body token context, returning the
 * browser's computed serialization (which need not be rgb()).
 *
 * The probe lives outside panel scope: panel chrome's color-scheme: dark
 * would collapse light-dark() to its dark side, and --tokentweak-* defaults
 * could shadow host tokens. Sinks targeting a root other than document are
 * outside this resolver's scope.
 */
export function resolveCssColorInHost(
  value: string,
  mode?: 'light' | 'dark',
): string | null {
  if (typeof document === 'undefined' || !document.body || !document.defaultView || !value.trim()) return null;

  if (!wrapper || !probe || wrapper.ownerDocument !== document) {
    wrapper = createHiddenDiv();
    probe = createHiddenDiv();
    wrapper.append(probe);
  }
  // Hosts and test cleanup can remove or replace body contents between calls.
  if (wrapper.parentNode !== document.body) document.body.append(wrapper);
  if (probe.parentNode !== wrapper) wrapper.append(probe);

  wrapper.style.setProperty('color', SENTINEL, 'important');
  probe.style.setProperty('color-scheme', mode ?? 'inherit', 'important');
  // Invalid syntax leaves this explicit inheritance in place. Removing color
  // instead would expose `all: initial` and incorrectly report black as valid.
  probe.style.setProperty('color', 'inherit', 'important');
  probe.style.setProperty('color', value, 'important');

  const computed = document.defaultView.getComputedStyle(probe).color;
  if (computed !== SENTINEL) return computed || null;

  // Missing var() inherits the sentinel, but a real color can equal it too.
  // Change the inherited color once to distinguish the two cases.
  wrapper.style.setProperty('color', SECOND_SENTINEL, 'important');
  const verified = document.defaultView.getComputedStyle(probe).color;
  wrapper.style.setProperty('color', SENTINEL, 'important');
  return verified === SECOND_SENTINEL ? null : verified || null;
}
