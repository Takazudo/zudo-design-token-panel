import type { PanelConfig } from '../config/panel-config';
import type { ColorTweakState, TweakState } from '../state/tweak-state';
import { revertEntries, type ColorBaseline } from '../utils/token-diff';
import { buildTokenIndex } from '../utils/token-index';

/**
 * Remove only overrides the server confirms it wrote. CSS variables are
 * resolved through the manifest token index so color, secondary-color,
 * reserved, and generic tab state all follow the same address-based path.
 */
export function reconcileApplied(
  state: TweakState,
  writtenCssVars: readonly string[],
  cfg: PanelConfig,
  colorDefaults: ColorTweakState,
  secondaryDefaults?: ColorTweakState,
): TweakState {
  const index = buildTokenIndex(cfg);
  const written = new Set(writtenCssVars);
  const entries = index.entries.filter((entry) => written.has(entry.cssVar));
  const baseline: ColorBaseline = { color: colorDefaults, secondary: secondaryDefaults };
  return revertEntries(entries, baseline, cfg)(state);
}

export function writtenCssVarsFromResponse(response: {
  updated?: readonly { changed?: readonly string[] }[];
}): string[] {
  return Array.from(
    new Set((response.updated ?? []).flatMap((file) => file.changed ?? [])),
  );
}
