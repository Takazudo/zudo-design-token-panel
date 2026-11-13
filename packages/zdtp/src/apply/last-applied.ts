import type { PanelConfig } from '../config/panel-config';
import { storageKey_lastApplied } from '../config/panel-config';
import { defaultStorage } from '../state/tweak-state';
import { structuralEqual } from '../utils/structural-equal';

export type FlatOverrides = Record<string, string>;

export function loadLastApplied(cfg: PanelConfig): FlatOverrides {
  try {
    const value = JSON.parse(defaultStorage().getItem(storageKey_lastApplied(cfg)) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

export function saveLastApplied(overrides: FlatOverrides, cfg: PanelConfig): void {
  try {
    defaultStorage().setItem(storageKey_lastApplied(cfg), JSON.stringify(overrides));
  } catch {
    // Storage full or blocked: the baseline stays in memory for this session.
  }
}

export function unsavedCssVars(
  current: FlatOverrides,
  baseline: FlatOverrides,
): string[] {
  if (structuralEqual(current, baseline)) return [];
  return Array.from(new Set([...Object.keys(current), ...Object.keys(baseline)])).filter(
    (cssVar) => current[cssVar] !== baseline[cssVar],
  );
}
