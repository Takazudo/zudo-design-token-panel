"use client";

import { computed, getScope, signal } from '@takazudo/zfb/zudo-react';
import type { PanelInstanceHandle } from '@takazudo/zdtp';
import { PANEL_VERSION } from '../config/build-info.generated';
import { buildProvenanceLabel } from '../config/build-provenance';
import { panelConfig } from '../config/panel-config';

interface DemoControlsProps {
  controlsClass: string;
  metaClass: string;
  buttonClass: string;
  quietClass: string;
}

type Mode = 'light' | 'dark';

interface DemoApi {
  version: string;
  showDesignPanel(): void;
  hideDesignPanel(): void;
  toggleDesignPanel(): void;
}

declare global {
  interface Window {
    zdtpCssmodules?: DemoApi;
  }
}

function readMode(): Mode {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export default function DemoControls({ controlsClass, metaClass, buttonClass, quietClass }: DemoControlsProps) {
  const mode = signal<Mode>('light');
  let pendingToggle = false;
  const togglePanel = () => {
    if (window.zdtpCssmodules) window.zdtpCssmodules.toggleDesignPanel();
    else pendingToggle = !pendingToggle;
  };

  getScope().onActivate(() => {
    let disposed = false;
    let handle: PanelInstanceHandle | undefined;
    let api: DemoApi | undefined;
    mode.value = readMode();

    const delayMs = Number(new URLSearchParams(window.location.search).get('panelImportDelay') ?? '0');
    void (async () => {
      if (Number.isFinite(delayMs) && delayMs > 0) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
      }
      if (disposed) return;
      const zdtp = await import('@takazudo/zdtp');
      if (disposed) return;
      handle = zdtp.configurePanel(panelConfig);
      if (disposed) {
        handle.destroy();
        handle = undefined;
        return;
      }
      zdtp.reapplyPersistedOverrides();
      api = {
        version: PANEL_VERSION,
        showDesignPanel: () => handle?.open(),
        hideDesignPanel: () => handle?.close(),
        toggleDesignPanel: () => handle?.toggle(),
      };
      window.zdtpCssmodules = api;
      if (pendingToggle) {
        pendingToggle = false;
        handle.toggle();
      }
    })().catch((error) => {
      if (!disposed) console.error('Unable to initialize the token panel', error);
    });

    return () => {
      disposed = true;
      handle?.destroy();
      if (api && window.zdtpCssmodules === api) delete window.zdtpCssmodules;
    };
  });

  const toggleTheme = () => {
    const nextMode: Mode = readMode() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextMode;
    document.documentElement.style.colorScheme = nextMode;
    localStorage.setItem('zdtp-demo-cssmodules-theme', nextMode);
    mode.value = nextMode;
    window.dispatchEvent(new CustomEvent('color-scheme-changed'));
  };

  return (
    <div class={controlsClass}>
      <span class={metaClass} data-build-meta>css modules manifest · <span>{buildProvenanceLabel()}</span></span>
      <button type="button" class={`${buttonClass} ${quietClass}`} on:click={toggleTheme}>
        {computed(() => mode.value === 'dark' ? 'Light mode' : 'Dark mode')}
      </button>
      <button type="button" class={buttonClass} on:click={togglePanel}>
        Open token panel
      </button>
    </div>
  );
}
