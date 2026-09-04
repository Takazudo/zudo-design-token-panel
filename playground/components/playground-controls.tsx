"use client";

import { useEffect, useState } from 'preact/hooks';
import panelPackage from '@takazudo/zdtp/package.json';
import * as zdtp from '@takazudo/zdtp';
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
  const [mode, setMode] = useState<Mode>('light');
  const [manifest, setManifest] = useState<ManifestName>('playground');

  useEffect(() => {
    let activeMode = readMode();
    const selected = requestedManifest();
    let activeConfig = selected === 'zudo-doc' ? zudoDocConfigs[activeMode] : panelConfig;
    let handle = zdtp.configurePanel(activeConfig);

    zdtp.reapplyPersistedOverrides();
    setMode(activeMode);
    setManifest(selected);

    window.zfb = {
      version: panelPackage.version,
      manifest: selected,
      ...(selected === 'zudo-doc' ? { manifestSourceVersion: ZUDO_DOC_SOURCE_VERSION } : {}),
      showDesignPanel: () => handle.open(),
      hideDesignPanel: () => handle.close(),
      toggleDesignPanel: () => handle.toggle(),
    };

    const alias = (window as unknown as {
      zdtp?: { show(): void; hide(): void; toggle(): void; version?: string };
    }).zdtp;
    if (alias) alias.version = panelPackage.version;

    const onSchemeChange = () => {
      const nextMode = readMode();
      activeMode = nextMode;
      setMode(nextMode);
      if (selected !== 'zudo-doc') return;

      const shouldReopen = localStorage.getItem(`${activeConfig.storagePrefix}:visible`) === '1';
      handle.destroy();
      activeConfig = zudoDocConfigs[nextMode];
      handle = zdtp.configurePanel(activeConfig);
      zdtp.reapplyPersistedOverrides();
      if (shouldReopen) handle.open();
    };

    window.addEventListener('color-scheme-changed', onSchemeChange);
    return () => window.removeEventListener('color-scheme-changed', onSchemeChange);
  }, []);

  const toggleTheme = () => {
    const nextMode: Mode = mode === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextMode;
    document.documentElement.style.colorScheme = nextMode;
    localStorage.setItem('zfb-playground-theme', nextMode);
    window.dispatchEvent(new CustomEvent('color-scheme-changed'));
  };

  return (
    <div class="zfb-controls">
      <span class="zfb-meta">
        {manifest === 'zudo-doc' ? `zudo-doc ${ZUDO_DOC_SOURCE_VERSION}` : 'playground manifest'} · zdtp {panelPackage.version}
      </span>
      <button type="button" class="zfb-button zfb-button--quiet" onClick={toggleTheme}>
        {mode === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <button type="button" class="zfb-button" onClick={() => window.zfb?.toggleDesignPanel()}>
        Open token panel
      </button>
    </div>
  );
}
