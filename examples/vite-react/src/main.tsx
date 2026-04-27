/**
 * Vite + React entry.
 *
 * The only static-side-effect imports here are stylesheets (the demo's
 * reset + tokens CSS plus the panel package's bundled chrome CSS via
 * `/styles`). The panel JS is intentionally NOT imported statically: doing
 * so pulls the entire panel module — Preact runtime, all tabs, all modals
 * — into the initial chunk and Vite folds the dynamic import in
 * `lib/mount-panel.ts` back into the same chunk (Rollup warning:
 * "dynamic import will not move module into another chunk"), defeating
 * the lazy-load demonstration the issue calls for.
 *
 * Instead, `mount-panel.ts` is the single place that reaches into the
 * panel package. Its `loadPanelModule()` dynamically imports the package
 * and calls `configurePanel(panelConfig)` from the imported reference
 * BEFORE any panel API runs. The package's main entry reads
 * `getPanelConfig()` only from inside functions invoked at panel-show
 * time (never at module-init time), so deferring configurePanel into the
 * dynamic-import resolution is safe — every panel-API call sees the
 * host's intended config.
 */

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import './styles/reset.css';
import './styles/tokens.css';
import '@takazudo/zudo-design-token-panel/styles';

import { App } from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Vite + React example: #root element missing in index.html');
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
