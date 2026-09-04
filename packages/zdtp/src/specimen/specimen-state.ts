import type { PanelConfig } from '../config/panel-config';
import { storageKey_specimen } from '../config/panel-config';

export type SpecimenPreset = 'latin' | 'ja' | 'mixed';

export interface SpecimenState {
  text: string;
  preset: SpecimenPreset;
  overridden: boolean;
  width: number;
}

export const SPECIMEN_PRESETS: Readonly<Record<SpecimenPreset, string>> = {
  latin: 'The quick brown fox jumps over the lazy dog — 0123456789',
  ja: 'あのイーハトーヴォのすきとおった風、夏でも底に冷たさをもつ青いそら、うつくしい森で飾られたモリーオ市、郊外のぎらぎらひかる草の波。',
  mixed: 'デザイントークン Design Tokens — 見出し Heading / 本文 Body / 0123456789',
};

export const DEFAULT_SPECIMEN_STATE: SpecimenState = {
  text: SPECIMEN_PRESETS.ja,
  preset: 'ja',
  overridden: false,
  width: 420,
};

function isPreset(value: unknown): value is SpecimenPreset {
  return value === 'latin' || value === 'ja' || value === 'mixed';
}

export function loadSpecimenState(cfg: PanelConfig): SpecimenState {
  if (typeof window === 'undefined') return DEFAULT_SPECIMEN_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey_specimen(cfg));
    if (!raw) return DEFAULT_SPECIMEN_STATE;
    const value = JSON.parse(raw) as Record<string, unknown>;
    const preset = isPreset(value.preset) ? value.preset : DEFAULT_SPECIMEN_STATE.preset;
    const overridden = value.overridden === true;
    const width = typeof value.width === 'number' && Number.isFinite(value.width)
      ? Math.min(720, Math.max(240, value.width))
      : DEFAULT_SPECIMEN_STATE.width;
    const text = overridden && typeof value.text === 'string'
      ? value.text
      : SPECIMEN_PRESETS[preset];
    return { text, preset, overridden, width };
  } catch {
    return DEFAULT_SPECIMEN_STATE;
  }
}

export function saveSpecimenState(cfg: PanelConfig, state: SpecimenState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey_specimen(cfg), JSON.stringify(state));
  } catch {
    /* localStorage may be unavailable or full; specimen editing still works. */
  }
}
