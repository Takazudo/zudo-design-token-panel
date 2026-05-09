/**
 * Entry script for prose.html.
 *
 * Mirrors main.tsx: imports the same reset + token CSS and the panel styles,
 * then mounts the <ProseDemo> component into #root. The panel adapter is
 * bootstrapped inside ProseDemo's useEffect (same pattern as App.tsx) so
 * panel-driven token tweaks update the prose page live.
 */

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import './styles/reset.css';
import './styles/tokens.css';
import '@takazudo/zudo-design-token-panel/styles';

import { ProseDemo } from './components/ProseDemo';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Vite + React prose entry: #root element missing in prose.html');
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ProseDemo />
  </StrictMode>,
);
