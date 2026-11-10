import { COMMIT_SHA, NPM_LATEST, PANEL_VERSION, PROVENANCE } from './build-info.generated';

/** Shared by static pages and client controls; provenance comes from git tags. */
export function buildProvenanceLabel(): string {
  const build = `zdtp ${PANEL_VERSION}+${COMMIT_SHA}`;
  if (PROVENANCE === 'unknown') return `${build} · provenance unknown`;
  if (PROVENANCE === 'released') {
    return `${build} · released · npm latest ${NPM_LATEST}`;
  }
  return `${build} · ahead of v${PANEL_VERSION} · npm latest ${NPM_LATEST}`;
}
