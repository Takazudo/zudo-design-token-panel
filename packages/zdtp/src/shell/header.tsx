import { useEffect, useRef, useState } from 'preact/compat';
import { Fragment, type JSX } from 'preact';
import { ActionsMenuPopover } from '../controls/actions-menu-popover';
import { useLayerRegistration } from './layer-activity';
import { useShellRegions } from './regions';

export function ShellHeader({
  onMouseDown,
}: {
  onMouseDown: JSX.MouseEventHandler<HTMLDivElement>;
}) {
  const { items } = useShellRegions();
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuBtnRef = useRef<HTMLDivElement>(null);
  useLayerRegistration('header-actions-menu', showActionsMenu);

  const isActionsTriggerRendered = () => {
    const trigger = actionsMenuBtnRef.current;
    if (!trigger || getComputedStyle(trigger).display === 'none') return false;
    const { width, height } = trigger.getBoundingClientRect();
    return width > 0 && height > 0;
  };

  useEffect(() => {
    const trigger = actionsMenuBtnRef.current;
    if (!trigger) return;
    // CSS owns compactness, including the different borders in each dock mode.
    // Observe actual layout so host/container changes need no panel state update.
    const reconcile = () => {
      if (!isActionsTriggerRendered()) setShowActionsMenu(false);
    };
    reconcile();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(reconcile);
    observer.observe(trigger);
    const shell = trigger.closest('.tokenpanel-shell');
    if (shell) observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  const toggleActionsMenu = () => {
    setShowActionsMenu((value) => !value && isActionsTriggerRendered());
  };

  const closeCompactMenu = () => setShowActionsMenu(false);
  const compactActions = items['header-actions'].flatMap((item) =>
    item.compactAction ? [item.compactAction] : [],
  );
  const compactRegionItems = [...items['header-actions'], ...items['header-right']].filter(
    (item) => item.renderInCompactMenu,
  );

  return (
    <div className="tokenpanel-header" style={{ cursor: 'move' }} onMouseDown={onMouseDown}>
      <span className="tokenpanel-title">zdtp</span>
      {items['header-actions'].map((item) => (
        <Fragment key={item.id}>
          {item.render({ compact: false, closeCompactMenu })}
        </Fragment>
      ))}
      <div
        ref={actionsMenuBtnRef}
        role="button"
        tabIndex={0}
        className="tokenpanel-actions-menu-btn"
        aria-label="Panel actions"
        aria-expanded={showActionsMenu}
        aria-haspopup="dialog"
        onClick={toggleActionsMenu}
        onKeyDown={(event) => {
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
      {showActionsMenu && (
        <ActionsMenuPopover
          anchorRef={actionsMenuBtnRef}
          actions={compactActions}
          onClose={closeCompactMenu}
        >
          {compactRegionItems.map((item) => (
            <Fragment key={item.id}>
              {item.render({ compact: true, closeCompactMenu })}
            </Fragment>
          ))}
        </ActionsMenuPopover>
      )}
      <div className="tokenpanel-spacer" />
      {items['header-right'].map((item) => (
        <Fragment key={item.id}>
          {item.render({ compact: false, closeCompactMenu })}
        </Fragment>
      ))}
    </div>
  );
}
