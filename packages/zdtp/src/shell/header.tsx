import { useEffect, useRef, useState } from 'preact/compat';
import { Fragment, type JSX } from 'preact';
import { ActionsMenuPopover } from '../controls/actions-menu-popover';
import { useLayerRegistration } from './layer-activity';
import { useShellRegions } from './regions';

// Must match the 479px content-box container query in panel.css. The shell's
// two border pixels make 482px the equivalent border-box threshold.
const ACTIONS_MENU_BREAKPOINT_PX = 482;

export function ShellHeader({
  width,
  onMouseDown,
}: {
  width: number;
  onMouseDown: JSX.MouseEventHandler<HTMLDivElement>;
}) {
  const { items } = useShellRegions();
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuBtnRef = useRef<HTMLDivElement>(null);
  useLayerRegistration('header-actions-menu', showActionsMenu);

  useEffect(() => {
    if (showActionsMenu && width >= ACTIONS_MENU_BREAKPOINT_PX) setShowActionsMenu(false);
  }, [showActionsMenu, width]);

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
        onClick={() => setShowActionsMenu((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setShowActionsMenu((value) => !value);
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
