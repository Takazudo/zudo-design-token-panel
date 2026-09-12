import type { TierConfig, TierValueKind } from '../tokens/tier-model';

/** Internal, render-independent description of declared token defaults. */
export type DashboardMode = 'light' | 'dark' | 'host';

export type DashboardInclude = 'all' | 'mode-dependent' | 'mode-independent';

export interface DashboardModelOptions {
  mode?: DashboardMode;
  include?: DashboardInclude;
}

/** Appearance of the dashboard chrome, independent of declared token mode. */
export type DashboardChrome = 'light' | 'dark' | 'host';

export interface DashboardDiagnostic {
  code: string;
  severity: 'warning' | 'error';
  message: string;
  rowKey?: string;
}

export interface DashboardReference {
  key: string;
  cssVar: string;
  label: string;
}

export interface DashboardRow {
  /** Positional identity stays unique even when a manifest repeats identifiers. */
  key: string;
  tabId: string;
  tierId: string;
  itemId: string;
  label: string;
  cssVar: string;
  kind: TierValueKind['kind'];
  source: 'item' | 'base-role';
  modeDependent: boolean;
  /** Direct authored pair; reference-derived dependence has no local pair. */
  sides: { light: string; dark: string } | null;
  origin: 'modes' | 'semantic' | 'default' | 'reference' | null;
  defaultValue: string;
  /** Human-readable selected-mode declaration, including explicit semantic overrides. */
  declaredValue: string;
  /** Safe local CSS declaration; null for an invalid or ambiguous declaration. */
  cssValue: string | null;
  /**
   * Follows direct declared references only, never computes CSS. Expressions
   * remain expressions. Null means invalid or dependent on unknown context.
   * In host mode, mode-dependent rows stay null while cssValue retains the
   * declarations needed for the browser to resolve the inherited scheme.
   */
  resolvedValue: string | null;
  references: DashboardReference[];
  diagnostics: DashboardDiagnostic[];
}

export interface DashboardTier {
  key: string;
  id: string;
  label: string;
  /** Nonsemantic, non-reference, color-only source tier. */
  palette?: boolean;
  preview?: TierConfig['preview'];
  previewBase?: string;
  rows: DashboardRow[];
}

export interface DashboardTab {
  key: string;
  id: string;
  label: string;
  tiers: DashboardTier[];
}

export interface DashboardModel {
  mode: DashboardMode;
  include: DashboardInclude;
  /** Visible inventory, with empty tiers and tabs omitted. */
  tabs: DashboardTab[];
  /** Complete graph, including rows hidden by include. */
  rows: DashboardRow[];
  /** Declare these on each preview scope, never on :root or the document. */
  declarations: Readonly<Record<string, string>>;
  diagnostics: DashboardDiagnostic[];
}
