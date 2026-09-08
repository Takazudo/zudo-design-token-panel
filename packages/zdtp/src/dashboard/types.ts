import type { TierConfig, TierValueKind } from '../tokens/tier-model';

/** Internal, render-independent description of declared token defaults. */
export type DashboardMode = 'light' | 'dark';

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
  defaultValue: string;
  /** Human-readable selected-mode declaration, including explicit semantic overrides. */
  declaredValue: string;
  /** Safe local CSS declaration; null for an invalid or ambiguous declaration. */
  cssValue: string | null;
  /**
   * Follows direct declared references only, never computes CSS. Expressions
   * remain expressions. Null means invalid or dependent on unknown context;
   * the renderer must not show a value preview in that case.
   */
  resolvedValue: string | null;
  references: DashboardReference[];
  diagnostics: DashboardDiagnostic[];
}

export interface DashboardTier {
  key: string;
  id: string;
  label: string;
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
  tabs: DashboardTab[];
  rows: DashboardRow[];
  /** Declare these on each preview scope, never on :root or the document. */
  declarations: Readonly<Record<string, string>>;
  diagnostics: DashboardDiagnostic[];
}
