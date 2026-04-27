/**
 * Vite + React entry.
 *
 * The order below matters and is the entire point of the example:
 *
 *   1. Side-effect import of the demo's reset + tokens stylesheets and the
 *      panel package's bundled chrome stylesheet. Vite's library mode strips
 *      the panel's source CSS import from the emitted JS, so consumers must
 *      re-pull it explicitly via the `/styles` sub-export.
 *   2. `configurePanel(panelConfig)` runs SYNCHRONOUSLY before the first
 *      React render. Every consumer of `getPanelConfig()` (storage keys,
 *      console namespace, modal class prefix, …) therefore observes the
 *      host's intended values for any read that happens during render or in
 *      a mount effect. The Astro example achieves the same ordering via an
 *      inline JSON `<script>` parsed by the package-provided host adapter;
 *      because we have no host component here, we wire it directly in TS.
 *   3. `ReactDOM.createRoot(...).render(<App />)` mounts the React tree.
 *      `<App />`'s mount effect then calls `mountPanel()` to install the
 *      window console API and lazy-load the panel module on demand.
 */

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { configurePanel } from '@takazudo/zudo-design-token-panel';

import './styles/reset.css';
import './styles/tokens.css';
import '@takazudo/zudo-design-token-panel/styles';

import { panelConfig } from './config/panel-config';
import { App } from './App';

// Configure BEFORE the first render so any reader of getPanelConfig()
// observes the host's intended values. configurePanel shallow-clones, so
// later mutations of `panelConfig` would NOT propagate — the singleton is
// frozen-by-copy at this call.
configurePanel(panelConfig);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Vite + React example: #root element missing in index.html');
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
