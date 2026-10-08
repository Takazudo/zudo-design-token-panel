"use client";

import { computed, getScope, signal } from '@takazudo/zfb/zudo-react';
import type { PanelInstanceHandle } from '@takazudo/zdtp';
import { PANEL_VERSION } from '../config/build-info.generated';
import { buildProvenanceLabel } from '../config/build-provenance';
import { panelConfig } from '../config/panel-config';
import { ZUDO_DOC_SOURCE_VERSION, zudoDocConfigs } from '../config/zudo-doc-manifest.generated';

type Mode = 'light' | 'dark';
type ManifestName = 'playground' | 'zudo-doc';

interface PlaygroundApi {
  version: string;
  manifest: ManifestName;
  manifestSourceVersion?: string;
  showDesignPanel(): void;
  hideDesignPanel(): void;
  toggleDesignPanel(): void;
}

declare global {
  interface Window {
    zfb?: PlaygroundApi;
  }
}

function readMode(): Mode {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function requestedManifest(): ManifestName {
  return new URLSearchParams(window.location.search).get('manifest') === 'zudo-doc'
    ? 'zudo-doc'
    : 'playground';
}

export default function PlaygroundControls() {
  const mode = signal<Mode>('light');
  const manifest = signal<ManifestName>('playground');

  let pendingToggle = false;
  const togglePanel = () => {
    if (window.zfb) window.zfb.toggleDesignPanel();
    else pendingToggle = !pendingToggle;
  };

  getScope().onActivate(() => {
    let disposed = false;
    let handle: PanelInstanceHandle | undefined;
    let api: PlaygroundApi | undefined;
    let removeSchemeListener: (() => void) | undefined;
    const selected = requestedManifest();
    mode.value = readMode();
    manifest.value = selected;

    void import('@takazudo/zdtp').then((zdtp) => {
      if (disposed) return;
      let activeConfig = selected === 'zudo-doc' ? zudoDocConfigs[readMode()] : panelConfig;
      handle = zdtp.configurePanel(activeConfig);
      zdtp.reapplyPersistedOverrides();

      api = {
        version: PANEL_VERSION,
        manifest: selected,
        ...(selected === 'zudo-doc' ? { manifestSourceVersion: ZUDO_DOC_SOURCE_VERSION } : {}),
        showDesignPanel: () => handle?.open(),
        hideDesignPanel: () => handle?.close(),
        toggleDesignPanel: () => handle?.toggle(),
      };
      window.zfb = api;
      if (pendingToggle) {
        pendingToggle = false;
        handle.toggle();
      }

      const alias = (window as unknown as {
        zdtp?: { show(): void; hide(): void; toggle(): void; version?: string };
      }).zdtp;
      if (alias) alias.version = PANEL_VERSION;

      const onSchemeChange = () => {
        const nextMode = readMode();
        mode.value = nextMode;
        if (selected !== 'zudo-doc') return;
        const shouldReopen = localStorage.getItem(`${activeConfig.storagePrefix}:visible`) === '1';
        handle?.destroy();
        activeConfig = zudoDocConfigs[nextMode];
        handle = zdtp.configurePanel(activeConfig);
        zdtp.reapplyPersistedOverrides();
        if (shouldReopen) handle.open();
      };
      window.addEventListener('color-scheme-changed', onSchemeChange);
      removeSchemeListener = () => window.removeEventListener('color-scheme-changed', onSchemeChange);
    }).catch((error) => {
      if (!disposed) console.error('Unable to initialize the token panel', error);
    });

    return () => {
      disposed = true;
      removeSchemeListener?.();
      handle?.destroy();
      if (api && window.zfb === api) delete window.zfb;
    };
  });

  const toggleTheme = () => {
    const nextMode: Mode = readMode() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextMode;
    document.documentElement.style.colorScheme = nextMode;
    localStorage.setItem('zfb-playground-theme', nextMode);
    mode.value = nextMode;
    window.dispatchEvent(new CustomEvent('color-scheme-changed'));
  };

  return (
    <div class="zfb-controls">
      <span class="zfb-meta">
        {computed(() => manifest.value === 'zudo-doc' ? `zudo-doc ${ZUDO_DOC_SOURCE_VERSION}` : 'playground manifest')} · <span>{buildProvenanceLabel()}</span>
      </span>
      <button type="button" class="zfb-button zfb-button--quiet" on:click={toggleTheme}>
        {computed(() => mode.value === 'dark' ? 'Light mode' : 'Dark mode')}
      </button>
      <button type="button" class="zfb-button" on:click={togglePanel}>
        Open token panel
      </button>
    </div>
  );
}
