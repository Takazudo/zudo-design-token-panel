/**
 * DOM Tweaker lazy boundary.
 *
 * The eager orchestrator dynamically imports this boundary on first enable. This
 * file owns every heavy dependency and browser-only surface: Tailwind browser
 * runtime startup, Alt-click picking, pinned selection, class editing, and
 * diff export. The eager side passes scalar config values explicitly so the
 * lazy boundary does not read global panel config.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { PanelConfig } from '../../config/panel-config';
import { buildSummary } from '../../element-path/build-element-path';
import { AltClickPicker, type AltClickPickerClassNames } from '../../picker';
import { Z } from '../../styles/z-index-tokens';
import type { DomTweakerRuntimeStatus } from '../dom-tweaker-context';
import {
  addClass,
  formatSessionDiff,
  getElementRecord,
  removeClass,
  resetAll,
} from './edit-session';
import { ClassEditorPopup } from './class-editor-popup';
import { DiffExportModal } from './diff-export-modal';
import {
  EditIconButton,
  PinnedSelectionOverlay,
} from './pinned-selection-overlay';
import { buildSuggestions } from './suggestions';
import { ensureDomTweakerStyles } from './style-injection';
import { ensureRuntime } from './tailwind-runtime';

export {
  buildStaticSuggestions,
  buildSuggestions,
  buildThemeSuggestions,
  filterSuggestions,
  STATIC_SUGGESTIONS,
} from './suggestions';

const DOM_TWEAKER_PICKER_FEATURE_ID = 'dom-tweaker';

const DOM_TWEAKER_PICKER_CLASS_NAMES: AltClickPickerClassNames = {
  box: 'tokenpanel-domtweaker-picker-box',
  label: 'tokenpanel-domtweaker-picker-label',
  labelName: 'tokenpanel-domtweaker-picker-label-name',
  labelSize: 'tokenpanel-domtweaker-picker-label-size',
  inspectingRoot: 'tokenpanel-domtweaker-inspecting',
};

export interface DomTweakerLazyBoundaryProps {
  enabled: boolean;
  storagePrefix: string;
  themeCss?: string;
  consoleNamespace: string;
  modalClassPrefix: string;
  showDiffExport: boolean;
  onCloseDiffExport: () => void;
  onRuntimeStatusChange: (status: DomTweakerRuntimeStatus) => void;
  onArmingRevoked: () => void;
}

function makeLazyPanelConfig({
  storagePrefix,
  themeCss,
  consoleNamespace,
  modalClassPrefix,
}: Pick<
  DomTweakerLazyBoundaryProps,
  'consoleNamespace' | 'modalClassPrefix' | 'storagePrefix' | 'themeCss'
>): PanelConfig {
  return {
    storagePrefix,
    consoleNamespace,
    modalClassPrefix,
    schemaId: `${storagePrefix}/dom-tweaker`,
    exportFilenameBase: `${storagePrefix}-dom-tweaker`,
    tabs: [],
    domTweaker: themeCss === undefined ? {} : { themeCss },
  };
}

function canStartRuntimeInThisEnvironment(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  return !/\bjsdom\b/i.test(window.navigator.userAgent);
}

function readCurrentClasses(el: Element | null, sessionVersion: number): readonly string[] {
  void sessionVersion;
  if (!el) return [];
  return getElementRecord(el)?.currentClasses ?? Array.from(el.classList);
}

export function DomTweakerLazyBoundary({
  enabled,
  storagePrefix,
  themeCss = '',
  consoleNamespace,
  modalClassPrefix,
  showDiffExport,
  onCloseDiffExport,
  onRuntimeStatusChange,
  onArmingRevoked,
}: DomTweakerLazyBoundaryProps): JSX.Element | null {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const mountedRef = useRef(false);
  const runtimeStartRequestedRef = useRef(false);

  const bumpSessionVersion = useCallback(() => {
    setSessionVersion((version) => version + 1);
  }, []);

  const suggestions = useMemo(() => buildSuggestions(themeCss), [themeCss]);
  const instanceConfig = useMemo(
    () =>
      makeLazyPanelConfig({
        storagePrefix,
        themeCss,
        consoleNamespace,
        modalClassPrefix,
      }),
    [consoleNamespace, modalClassPrefix, storagePrefix, themeCss],
  );

  const selectedSummary = useMemo(
    () => (selectedElement ? buildSummary(selectedElement) : ''),
    [selectedElement, sessionVersion],
  );
  const currentClasses = useMemo(
    () => readCurrentClasses(selectedElement, sessionVersion),
    [selectedElement, sessionVersion],
  );
  const diffText = useMemo(() => formatSessionDiff(), [sessionVersion, showDiffExport]);

  useEffect(() => {
    mountedRef.current = true;
    ensureDomTweakerStyles();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || runtimeStartRequestedRef.current) return;
    runtimeStartRequestedRef.current = true;

    if (!canStartRuntimeInThisEnvironment()) {
      onRuntimeStatusChange('error');
      console.warn(
        `[${consoleNamespace}] [design-token-panel] DOM Tweaker Tailwind runtime is unavailable outside a browser document.`,
      );
      return;
    }

    onRuntimeStatusChange('loading');
    ensureRuntime({ themeCss })
      .then(() => {
        if (mountedRef.current) onRuntimeStatusChange('ready');
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        onRuntimeStatusChange('error');
        console.warn(
          `[${consoleNamespace}] [design-token-panel] Failed to start DOM Tweaker Tailwind runtime.`,
          err,
        );
      });
  }, [consoleNamespace, enabled, onRuntimeStatusChange, themeCss]);

  useEffect(() => {
    if (enabled) return;
    setEditorOpen(false);
    setSelectedElement(null);
  }, [enabled]);

  const handleElementPicked = useCallback((el: Element) => {
    setSelectedElement(el);
    setEditorOpen(false);
  }, []);

  const handleTargetDisconnected = useCallback(() => {
    setEditorOpen(false);
    setSelectedElement(null);
  }, []);

  const handleAddClass = useCallback(
    (className: string) => {
      if (!selectedElement) return;
      addClass(selectedElement, className);
      bumpSessionVersion();
    },
    [bumpSessionVersion, selectedElement],
  );

  const handleRemoveClass = useCallback(
    (className: string) => {
      if (!selectedElement) return;
      removeClass(selectedElement, className);
      bumpSessionVersion();
    },
    [bumpSessionVersion, selectedElement],
  );

  const handleResetAll = useCallback(() => {
    resetAll();
    bumpSessionVersion();
  }, [bumpSessionVersion]);

  return (
    <>
      <AltClickPicker
        enabled={enabled}
        featureId={DOM_TWEAKER_PICKER_FEATURE_ID}
        onElementPicked={handleElementPicked}
        onArmingRevoked={onArmingRevoked}
        claimArmingOnEnable
        getLabelText={buildSummary}
        ariaLiveMessage={
          enabled ? 'DOM Tweaker enabled. Hold Alt and click an element to edit classes.' : null
        }
        classNames={DOM_TWEAKER_PICKER_CLASS_NAMES}
        zIndex={Z.inspectorBox}
      />

      <PinnedSelectionOverlay
        target={selectedElement}
        visible={enabled}
        onTargetDisconnected={handleTargetDisconnected}
      />
      <EditIconButton
        target={selectedElement}
        visible={enabled && selectedElement !== null}
        onOpenEditor={() => setEditorOpen(true)}
      />
      <ClassEditorPopup
        target={selectedElement}
        selectorSummary={selectedSummary}
        currentClasses={currentClasses}
        suggestions={suggestions}
        onAddClass={handleAddClass}
        onRemoveClass={handleRemoveClass}
        onClose={() => setEditorOpen(false)}
        visible={enabled && editorOpen}
      />

      {showDiffExport && (
        <DiffExportModal
          diffText={diffText}
          onClose={onCloseDiffExport}
          onResetAll={handleResetAll}
          instanceConfig={instanceConfig}
        />
      )}
    </>
  );
}
