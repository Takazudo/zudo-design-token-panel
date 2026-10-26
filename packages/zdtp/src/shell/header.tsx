/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, Show, signal } from '@takazudo/zfb/zudo-react';
import { ActionsMenuPopover } from '../controls/actions-menu-popover';
import { useLayerRegistration, type LayerActivity } from './layer-activity';
import type { ShellRegions } from './regions';
import { RegionItems } from './region-items';

export function ShellHeader({
  onMouseDown,
  regions,
  layers,
}: {
  onMouseDown: (event: MouseEvent) => void;
  regions: ShellRegions;
  layers: LayerActivity;
}) {
  const showActionsMenu = signal(false);
  const actionsMenuBtnRef: { current: HTMLDivElement | null } = { current: null };
  useLayerRegistration(layers, 'header-actions-menu', showActionsMenu);

  const isActionsTriggerRendered = () => {
    const trigger = actionsMenuBtnRef.current;
    if (!trigger || getComputedStyle(trigger).display === 'none') return false;
    const { width, height } = trigger.getBoundingClientRect();
    return width > 0 && height > 0;
  };

  getScope().onActivate(() => {
    const trigger = actionsMenuBtnRef.current;
    if (!trigger) return;
    // CSS owns compactness, including the different borders in each dock mode.
    // Observe actual layout so host/container changes need no panel state update.
    const reconcile = () => {
      if (!isActionsTriggerRendered()) showActionsMenu.value = false;
    };
    reconcile();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(reconcile);
    observer.observe(trigger);
    const shell = trigger.closest('.tokenpanel-shell');
    if (shell) observer.observe(shell);
    return () => observer.disconnect();
  });

  const toggleActionsMenu = () => {
    showActionsMenu.value = !showActionsMenu.value && isActionsTriggerRendered();
  };

  const closeCompactMenu = () => {
    showActionsMenu.value = false;
  };
  const headerActions = computed(() => regions.items.value['header-actions']);
  const headerRight = computed(() => regions.items.value['header-right']);
  const compactRegionItems = computed(() =>
    [...headerActions.value, ...headerRight.value].filter((item) => item.renderInCompactMenu),
  );
  const wide = { compact: false, closeCompactMenu };

  return (
    <div class="tokenpanel-header" style="cursor: move" on:mousedown={onMouseDown}>
      <span class="tokenpanel-title">zdtp</span>
      <RegionItems items={headerActions} context={wide} />
      <div
        ref={actionsMenuBtnRef}
        role="button"
        tabindex={0}
        class="tokenpanel-actions-menu-btn"
        aria-label="Panel actions"
        aria-expanded={showActionsMenu}
        aria-haspopup="dialog"
        on:click={toggleActionsMenu}
        on:keydown={(event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleActionsMenu();
          }
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </div>
      <Show when={showActionsMenu}>
        {() => (
          <ActionsMenuPopover
            anchorRef={actionsMenuBtnRef}
            actions={headerActions.value.flatMap((item) => (item.compactAction ? [item.compactAction] : []))}
            onClose={closeCompactMenu}
          >
            <RegionItems items={compactRegionItems} context={{ compact: true, closeCompactMenu }} />
          </ActionsMenuPopover>
        )}
      </Show>
      <div class="tokenpanel-spacer" />
      <RegionItems items={headerRight} context={wide} />
    </div>
  );
}
