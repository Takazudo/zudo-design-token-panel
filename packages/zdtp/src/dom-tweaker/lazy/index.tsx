/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * DOM Tweaker lazy boundary.
 *
 * The eager orchestrator dynamically imports this boundary on first enable. This
 * file owns every heavy dependency and browser-only surface: Tailwind browser
 * runtime startup, Alt-click picking, pinned selection, class editing, and
 * diff export. The eager side passes scalar config values explicitly so the
 * lazy boundary does not read global panel config.
 */

import { computed, getScope, Show, signal } from '@takazudo/zfb/zudo-react';
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
import { read, type Reactive } from '../../zr/live';

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

export type DomTweakerLazyBoundaryStaticKeys =
  | 'storagePrefix'
  | 'themeCss'
  | 'consoleNamespace'
  | 'modalClassPrefix'
  | 'onCloseDiffExport'
  | 'onRuntimeStatusChange'
  | 'onArmingRevoked';

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

function readCurrentClasses(el: Element | null): readonly string[] {
  if (!el) return [];
  return getElementRecord(el)?.currentClasses ?? Array.from(el.classList);
}

export function DomTweakerLazyBoundary(
  props: Reactive<DomTweakerLazyBoundaryProps, DomTweakerLazyBoundaryStaticKeys>,
) {
  const {
    storagePrefix,
    themeCss = '',
    consoleNamespace,
    modalClassPrefix,
    onCloseDiffExport,
    onRuntimeStatusChange,
    onArmingRevoked,
  } = props;
  const enabled = computed(() => read(props.enabled));
  const showDiffExport = computed(() => read(props.showDiffExport));
  const selectedElement = signal<Element | null>(null);
  const editorOpen = signal(false);
  const sessionVersion = signal(0);
  let mounted = false;
  let runtimeStartRequested = false;

  const bumpSessionVersion = () => {
    sessionVersion.value += 1;
  };

  const suggestions = buildSuggestions(themeCss);
  const instanceConfig = makeLazyPanelConfig({
    storagePrefix,
    themeCss,
    consoleNamespace,
    modalClassPrefix,
  });

  const selectedSummary = computed(() => {
    void sessionVersion.value;
    return selectedElement.value ? buildSummary(selectedElement.value) : '';
  });
  const currentClasses = computed(() => {
    void sessionVersion.value;
    return readCurrentClasses(selectedElement.value);
  });
  const diffText = computed(() => {
    void sessionVersion.value;
    void showDiffExport.value;
    return formatSessionDiff();
  });

  const scope = getScope();
  scope.onActivate(() => {
    mounted = true;
    ensureDomTweakerStyles();
    return () => {
      mounted = false;
    };
  });

  scope.effect(() => {
    if (!enabled.value || runtimeStartRequested) return;
    runtimeStartRequested = true;

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
        if (mounted) onRuntimeStatusChange('ready');
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        onRuntimeStatusChange('error');
        console.warn(
          `[${consoleNamespace}] [design-token-panel] Failed to start DOM Tweaker Tailwind runtime.`,
          err,
        );
      });
  });

  scope.effect(() => {
    if (enabled.value) return;
    editorOpen.value = false;
    selectedElement.value = null;
  });

  const handleElementPicked = (el: Element) => {
    selectedElement.value = el;
    editorOpen.value = false;
  };

  const handleTargetDisconnected = () => {
    editorOpen.value = false;
    selectedElement.value = null;
  };

  const handleAddClass = (className: string) => {
    const el = selectedElement.value;
    if (!el) return;
    addClass(el, className);
    bumpSessionVersion();
  };

  const handleRemoveClass = (className: string) => {
    const el = selectedElement.value;
    if (!el) return;
    removeClass(el, className);
    bumpSessionVersion();
  };

  const handleResetAll = () => {
    resetAll();
    bumpSessionVersion();
  };

  return [
    <AltClickPicker
      enabled={enabled}
      featureId={DOM_TWEAKER_PICKER_FEATURE_ID}
      onElementPicked={handleElementPicked}
      onArmingRevoked={onArmingRevoked}
      claimArmingOnEnable
      getLabelText={buildSummary}
      ariaLiveMessage={computed(() => (enabled.value
        ? 'DOM Tweaker enabled. Hold Alt and click an element to edit classes.'
        : null))}
      classNames={DOM_TWEAKER_PICKER_CLASS_NAMES}
      zIndex={Z.inspectorBox}
    />,
    <PinnedSelectionOverlay
      target={selectedElement}
      visible={enabled}
      onTargetDisconnected={handleTargetDisconnected}
    />,
    <EditIconButton
      target={selectedElement}
      visible={computed(() => enabled.value && selectedElement.value !== null)}
      onOpenEditor={() => {
        editorOpen.value = true;
      }}
    />,
    <ClassEditorPopup
      target={selectedElement}
      selectorSummary={selectedSummary}
      currentClasses={currentClasses}
      suggestions={suggestions}
      onAddClass={handleAddClass}
      onRemoveClass={handleRemoveClass}
      onClose={() => {
        editorOpen.value = false;
      }}
      visible={computed(() => enabled.value && editorOpen.value)}
    />,
    <Show when={showDiffExport}>
      {() => (
        <DiffExportModal
          diffText={diffText}
          onClose={onCloseDiffExport}
          onResetAll={handleResetAll}
          instanceConfig={instanceConfig}
        />
      )}
    </Show>,
  ];
}
