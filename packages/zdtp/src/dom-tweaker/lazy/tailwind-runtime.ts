export interface RuntimeOptions {
  readonly themeCss?: string;
}

export type RuntimeStartMode = 'module-import' | 'blob-script';

export interface RuntimeHandle {
  readonly ready: true;
  readonly startMode: RuntimeStartMode;
  readonly styleElement: HTMLStyleElement;
  readonly themeCss: string;
}

const TAILWIND_STYLE_TYPE = 'text/tailwindcss';
const RUNTIME_STYLE_ATTR = 'data-zdtp-dom-tweaker-tailwind-runtime';
const RUNTIME_SCRIPT_ATTR = 'data-zdtp-dom-tweaker-tailwind-runtime-script';
const READINESS_INTERVAL_MS = 50;
const READINESS_TIMEOUT_MS = 10_000;

let runtimePromise: Promise<RuntimeHandle> | undefined;

/**
 * Starts the DOM Tweaker Tailwind runtime once per page.
 *
 * There is intentionally no teardown API in v1. `@tailwindcss/browser` installs
 * document-level MutationObservers and appends its generated utility stylesheet
 * without exposing a public cleanup hook. Reusing the first promise avoids
 * stacking observers/styles across panel open-close cycles, and matches the
 * runtime's page-lifetime design.
 */
export function ensureRuntime(opts: RuntimeOptions = {}): Promise<RuntimeHandle> {
  runtimePromise ??= createRuntime(opts);
  return runtimePromise;
}

async function createRuntime(opts: RuntimeOptions): Promise<RuntimeHandle> {
  assertBrowserDocument();
  const themeCss = opts.themeCss ?? '';
  const styleElement = injectTailwindInput(themeCss);
  const startMode = await startTailwindBrowserRuntime();

  try {
    await waitForReadinessProbe();
  } catch (cause) {
    throw new Error('DOM Tweaker Tailwind runtime did not become ready.', { cause });
  }

  return {
    ready: true,
    startMode,
    styleElement,
    themeCss,
  };
}

function assertBrowserDocument(): void {
  if (
    typeof document === 'undefined' ||
    document.documentElement === null ||
    document.head === null
  ) {
    throw new Error('DOM Tweaker Tailwind runtime requires a browser document.');
  }
}

function injectTailwindInput(themeCss: string): HTMLStyleElement {
  assertThemeCssDoesNotImportPreflight(themeCss);

  const style = document.createElement('style');
  style.type = TAILWIND_STYLE_TYPE;
  style.setAttribute(RUNTIME_STYLE_ATTR, '');
  style.textContent = buildTailwindInput(themeCss);
  document.head.append(style);
  return style;
}

function buildTailwindInput(themeCss: string): string {
  const hostCss = themeCss.trim();
  const chunks = [
    '@layer theme, base, components, utilities;',
    '@import "tailwindcss/theme.css" layer(theme);',
    '@import "tailwindcss/utilities.css" layer(utilities);',
  ];

  if (hostCss.length > 0) {
    chunks.push(hostCss);
  }

  return `${chunks.join('\n')}\n`;
}

function assertThemeCssDoesNotImportPreflight(themeCss: string): void {
  const disallowedTailwindImport =
    /@import\s+(?:url\(\s*)?["']tailwindcss(?:\/(?:preflight|base)(?:\.css)?)?["']/i;

  if (disallowedTailwindImport.test(themeCss)) {
    throw new Error(
      'DOM Tweaker themeCss must not import Tailwind preflight or the aggregate "tailwindcss" entry.',
    );
  }
}

async function startTailwindBrowserRuntime(): Promise<RuntimeStartMode> {
  const errors: unknown[] = [];

  try {
    // @ts-expect-error @tailwindcss/browser is a browser side-effect script and ships no declarations.
    await import('@tailwindcss/browser');
    return 'module-import';
  } catch (error) {
    errors.push(error);
  }

  try {
    await injectBundledBrowserScript();
    return 'blob-script';
  } catch (error) {
    errors.push(error);
  }

  throw new AggregateError(errors, 'Unable to start @tailwindcss/browser runtime.');
}

async function injectBundledBrowserScript(): Promise<void> {
  const source = await loadBundledBrowserScriptSource();
  const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));

  try {
    await appendScript(blobUrl, 'blob-script');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function loadBundledBrowserScriptSource(): Promise<string> {
  // @ts-expect-error Vite's ?raw query bundles the package's global dist script as text.
  const mod = (await import('@tailwindcss/browser?raw')) as { default?: unknown };
  const source = mod.default;

  if (typeof source !== 'string' || source.length === 0) {
    throw new Error('Bundled @tailwindcss/browser raw script was empty.');
  }

  return source;
}

function appendScript(src: string, mode: RuntimeStartMode): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.setAttribute(RUNTIME_SCRIPT_ATTR, mode);
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error(`Failed to load @tailwindcss/browser ${mode} script.`)),
      { once: true },
    );
    document.head.append(script);
  });
}

function waitForReadinessProbe(): Promise<void> {
  return new Promise((resolve, reject) => {
    const probe = document.createElement('div');
    probe.className = 'p-1';
    probe.setAttribute('aria-hidden', 'true');
    probe.setAttribute('data-zdtp-dom-tweaker-tailwind-runtime-probe', '');
    probe.style.cssText = [
      'position:fixed',
      'left:-9999px',
      'top:0',
      'width:1px',
      'height:1px',
      'pointer-events:none',
    ].join(';');

    (document.body ?? document.documentElement).append(probe);

    const startedAt = performance.now();
    const intervalId = window.setInterval(() => {
      if (hasNonZeroPadding(probe)) {
        cleanup();
        resolve();
        return;
      }

      if (performance.now() - startedAt >= READINESS_TIMEOUT_MS) {
        cleanup();
        reject(
          new Error(
            `Timed out after ${READINESS_TIMEOUT_MS}ms waiting for Tailwind to compile .p-1.`,
          ),
        );
      }
    }, READINESS_INTERVAL_MS);

    function cleanup(): void {
      window.clearInterval(intervalId);
      probe.remove();
    }
  });
}

function hasNonZeroPadding(el: Element): boolean {
  const style = getComputedStyle(el);
  return [
    style.paddingTop,
    style.paddingRight,
    style.paddingBottom,
    style.paddingLeft,
  ].some((value) => Number.parseFloat(value) > 0);
}
