import type { PanelConfig } from '../config/panel-config';
import type { ColorTweakState, SemanticValue, TweakState } from '../state/tweak-state';
import { revertEntries, type ColorBaseline } from '../utils/token-diff';
import { buildTokenIndex } from '../utils/token-index';

type DerivedRole = 'bg' | 'fg';

function colorSlice(state: TweakState, tabId: string): ColorTweakState | undefined {
  return tabId === 'color' ? state.color : tabId === 'color-secondary' ? state.secondary : undefined;
}

function withColorSlice(state: TweakState, tabId: string, color: ColorTweakState): TweakState {
  return tabId === 'color' ? { ...state, color } : { ...state, secondary: color };
}

function roleIndex(color: ColorTweakState, role: DerivedRole): number {
  return role === 'bg' ? color.background : color.foreground;
}

function setRoleIndex(color: ColorTweakState, role: DerivedRole, index: number): ColorTweakState {
  return role === 'bg' ? { ...color, background: index } : { ...color, foreground: index };
}

/**
 * Remove only overrides the server confirms it wrote. CSS variables are
 * resolved through the manifest token index so color, secondary-color,
 * reserved, and generic tab state all follow the same address-based path.
 *
 * A same-alias semantic mapping can be emitted because its bg/fg dependency
 * moved even though the mapping itself did not. Since base-role variables are
 * outside disk Apply, reconcile that dependency when its derived semantic var
 * was written. Unwritten aliases are first materialized to their current
 * numeric index so partial writes never discard their emitted value.
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
  const dependencyRoles = new Map<string, Set<DerivedRole>>();

  for (const entry of entries) {
    if (entry.source !== 'semantic') continue;
    const current = colorSlice(state, entry.address.tabId);
    const original = entry.address.tabId === 'color' ? colorDefaults : secondaryDefaults;
    if (!current || !original) continue;
    const currentMapping = current.semanticMappings[entry.address.itemId];
    const originalMapping = original.semanticMappings[entry.address.itemId];
    if ((currentMapping !== 'bg' && currentMapping !== 'fg') || originalMapping !== currentMapping) continue;
    if (roleIndex(current, currentMapping) === roleIndex(original, currentMapping)) continue;
    const roles = dependencyRoles.get(entry.address.tabId) ?? new Set<DerivedRole>();
    roles.add(currentMapping);
    dependencyRoles.set(entry.address.tabId, roles);
  }

  let next = revertEntries(entries, baseline, cfg)(state);
  for (const [tabId, roles] of dependencyRoles) {
    const before = colorSlice(state, tabId);
    const original = tabId === 'color' ? colorDefaults : secondaryDefaults;
    let reconciled = colorSlice(next, tabId);
    if (!before || !original || !reconciled) continue;

    for (const role of roles) {
      const resolvedIndex = roleIndex(before, role);
      const semanticMappings: Record<string, SemanticValue> = { ...reconciled.semanticMappings };
      for (const entry of index.entries) {
        if (entry.source !== 'semantic' || entry.address.tabId !== tabId || written.has(entry.cssVar)) continue;
        if (before.semanticMappings[entry.address.itemId] === role) {
          semanticMappings[entry.address.itemId] = resolvedIndex;
        }
      }
      reconciled = setRoleIndex(
        { ...reconciled, semanticMappings },
        role,
        roleIndex(original, role),
      );
    }
    next = withColorSlice(next, tabId, reconciled);
  }
  return next;
}

export function writtenCssVarsFromResponse(response: {
  updated?: readonly { changed?: readonly string[] }[];
}): string[] {
  return Array.from(
    new Set((response.updated ?? []).flatMap((file) => file.changed ?? [])),
  );
}
