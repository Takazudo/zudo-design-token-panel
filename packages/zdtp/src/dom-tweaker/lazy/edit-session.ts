import { twMerge } from 'tailwind-merge';
import { buildElementPath } from '../../element-path/build-element-path';

export interface EditSessionRecord {
  selector: string;
  summary: string;
  originalClasses: string[];
  currentClasses: string[];
}

export interface EditSessionDiff extends EditSessionRecord {
  addedClasses: string[];
  removedClasses: string[];
  isConnected: boolean;
}

interface InternalEditSessionRecord extends EditSessionRecord {
  element: Element;
}

const records = new Map<Element, InternalEditSessionRecord>();

function splitClassTokens(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/).filter(Boolean);
}

function readClassTokens(el: Element): string[] {
  const raw = el.getAttribute('class');
  if (!raw || !raw.trim()) return [];
  return Array.from(el.classList);
}

function writeClassTokens(el: Element, classes: string[]): void {
  const current = readClassTokens(el);
  if (current.length > 0) {
    el.classList.remove(...current);
  }

  const next = Array.from(new Set(classes));
  if (next.length > 0) {
    el.classList.add(...next);
  } else if (el.getAttribute('class') !== null) {
    el.removeAttribute('class');
  }
}

function snapshot(record: InternalEditSessionRecord): EditSessionRecord {
  return {
    selector: record.selector,
    summary: record.summary,
    originalClasses: [...record.originalClasses],
    currentClasses: [...record.currentClasses],
  };
}

function captureRecord(el: Element): InternalEditSessionRecord {
  const existing = records.get(el);
  if (existing) return existing;

  const path = buildElementPath(el);
  const originalClasses = readClassTokens(el);
  const record: InternalEditSessionRecord = {
    element: el,
    selector: path.selector,
    summary: path.summary,
    originalClasses,
    currentClasses: [...originalClasses],
  };
  records.set(el, record);
  return record;
}

function classesChanged(before: string[], after: string[]): boolean {
  if (before.length !== after.length) return true;
  return before.some((token, index) => token !== after[index]);
}

function applyClasses(el: Element, classes: string[]): void {
  writeClassTokens(el, classes);
  const record = records.get(el);
  if (record) {
    record.currentClasses = readClassTokens(el);
  }
}

export function addClass(el: Element, cls: string): void {
  const classesToAdd = splitClassTokens(cls);
  if (classesToAdd.length === 0) return;

  const before = readClassTokens(el);
  const next = splitClassTokens(twMerge([...before, ...classesToAdd].join(' ')));
  if (!classesChanged(before, next)) return;

  captureRecord(el);
  applyClasses(el, next);
}

export function removeClass(el: Element, cls: string): void {
  const classesToRemove = new Set(splitClassTokens(cls));
  if (classesToRemove.size === 0) return;

  const before = readClassTokens(el);
  const next = before.filter((token) => !classesToRemove.has(token));
  if (!classesChanged(before, next)) return;

  captureRecord(el);
  applyClasses(el, next);
}

export function resetElement(el: Element): void {
  const record = records.get(el);
  if (!record) return;

  writeClassTokens(el, record.originalClasses);
  records.delete(el);
}

export function resetAll(): void {
  for (const [el, record] of records) {
    writeClassTokens(el, record.originalClasses);
  }
  records.clear();
}

export function getElementRecord(el: Element): EditSessionRecord | null {
  const record = records.get(el);
  return record ? snapshot(record) : null;
}

export function getSessionRecords(): EditSessionRecord[] {
  return Array.from(records.values(), snapshot);
}

function getDiffClasses(record: EditSessionRecord): {
  addedClasses: string[];
  removedClasses: string[];
} {
  const original = new Set(record.originalClasses);
  const current = new Set(record.currentClasses);
  return {
    removedClasses: record.originalClasses.filter((token) => !current.has(token)),
    addedClasses: record.currentClasses.filter((token) => !original.has(token)),
  };
}

export function getSessionDiff(): EditSessionDiff[] {
  return Array.from(records.values())
    .map((record) => {
      const { addedClasses, removedClasses } = getDiffClasses(record);
      return {
        ...snapshot(record),
        addedClasses,
        removedClasses,
        isConnected: record.element.isConnected,
      };
    })
    .filter((diff) => diff.addedClasses.length > 0 || diff.removedClasses.length > 0);
}

function escapeQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function formatClassList(classes: string[]): string {
  return classes.map(escapeQuoted).join(' ');
}

export function formatSessionDiff(): string {
  return getSessionDiff()
    .map((diff) => {
      const selector = diff.isConnected ? diff.selector : `${diff.selector} (removed)`;
      const diffTokens = [
        ...diff.removedClasses.map((token) => `-${token}`),
        ...diff.addedClasses.map((token) => `+${token}`),
      ];

      return [
        `selector: ${selector}`,
        `before: "${formatClassList(diff.originalClasses)}"`,
        `after: "${formatClassList(diff.currentClasses)}"`,
        `diff: ${diffTokens.join(' ')}`,
      ].join('\n');
    })
    .join('\n\n');
}
