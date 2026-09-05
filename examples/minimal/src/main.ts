import '@takazudo/zdtp/styles';
import { configurePanel, showDesignTokenPanel } from '@takazudo/zdtp';
import {
  BUILT_AT,
  COMMIT_SHA,
  DEPLOY_MODE,
  NPM_LATEST,
  PANEL_VERSION,
  PROVENANCE,
} from './build-info.generated';
import { panelConfig } from './panel-config';
import './tokens.css';

configurePanel(panelConfig);

document.querySelector<HTMLButtonElement>('[data-open-panel]')?.addEventListener('click', () => {
  showDesignTokenPanel();
});

const provenanceText = {
  released: `released · npm latest ${NPM_LATEST}`,
  ahead: `ahead of v${PANEL_VERSION} · npm latest ${NPM_LATEST}`,
  unknown: 'provenance unknown',
}[PROVENANCE];

const buildInfo = document.querySelector<HTMLElement>('[data-build-info]');
if (buildInfo) {
  buildInfo.textContent = `zdtp ${PANEL_VERSION}+${COMMIT_SHA} · ${provenanceText}`;
  buildInfo.dataset.provenance = PROVENANCE;
}

const buildMode = document.querySelector<HTMLElement>('[data-build-mode]');
if (buildMode) buildMode.textContent = DEPLOY_MODE ? 'Deployed workspace build' : 'Local workspace build';

const builtAt = document.querySelector<HTMLTimeElement>('[data-built-at]');
if (builtAt) {
  builtAt.dateTime = BUILT_AT;
  builtAt.textContent = new Date(BUILT_AT).toLocaleString();
}

const commit = document.querySelector<HTMLAnchorElement>('[data-commit]');
if (commit) {
  commit.textContent = COMMIT_SHA;
  if (COMMIT_SHA !== 'unknown') {
    commit.href = `https://github.com/Takazudo/zudo-design-token-panel/tree/${COMMIT_SHA}`;
  } else {
    commit.removeAttribute('href');
  }
}
