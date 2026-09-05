# Keep dock modes visible and derive menu state from rendered CSS

Decision for #758, implementing #759 under epic #756. Baseline:
`323b9b07aa18a5864a9d445af090c851ac68fa1a` (includes #754).

## Evidence and limits

The #757 probe did **not reproduce the reported failure**. At the default
440px right dock, real pointer clicks opened Panel actions and selected Float
panel in both the playground and vendored zudo-doc manifests. Hit testing found
the actual trigger, the popover stayed inside the viewport, floating released
the host right margin, and neither run reported browser errors. Reload restored
the dock mode. The zudo-doc case used its real consumer configuration on the
playground host, not the original deployed consumer page.

The separate breakpoint defect is demonstrated: CSS compacts at shell content
width <=479px, while `ShellHeader` closes the menu at supplied border-box width
>=482px. A right dock has only one horizontal border, so its compact range ends
at border-box 480px. At 481px the trigger is hidden but JavaScript permits an
open menu. A synthetic hidden-trigger click isolated that mismatch; it is not
pointer reproduction evidence. Both predicates agree at 440px, so this defect
cannot explain the original observation.

## Chosen behavior

Choose **(b), visible dock-mode controls, plus reconciliation of the known
menu-state defect**. This is a defensive discoverability improvement and a
confirmed boundary correction, not a claimed root-cause repair.

Keep the existing four-icon `DockModeSwitch` in the header visible at compact
widths. Reuse the same instance already registered as `header-right` / `dock-modes`;
remove its compact-query hiding rule. This applies consistently to every full
shell (right, bottom and float), including 320px right docks. Mini continues to
use its existing pill. A pointer can choose float, right, bottom or mini directly
without first opening another surface.

Retain the existing labeled dock choices in Panel actions: they explain the
icons and preserve the working menu route. This introduces no extra component,
new popover, public option, storage key or dock-transition mechanism. All choices
continue through `handleDockModeChange`, and Alt+1 through Alt+4 retain their
current behavior, including existing specimen-mode restrictions.

The existing horizontal group uses four minimum 24px targets, roughly 106px in
all. Preserve those targets, accessible names, titles, pressed state and the
`RoleButton` Enter/Space behavior. Keep the title's shrink/ellipsis behavior and
other compact demotions. If the existing layout needs space at 320px, adjust only
compact header gap/padding; do not shrink targets, hide the dock group, move more
controls into a new surface or redesign wide chrome. Verify actual containment,
non-overlap and pointer hit targets before accepting the layout.

## Implementation ownership

- `packages/zdtp/src/styles/panel.css`: remove only
  `.tokenpanel-header > .tokenpanel-dock-modes` from the hidden-controls group
  inside `@container tokenpanel (max-width: 479px)`. Keep that CSS query as the
  sole compactness threshold. Header-only compact spacing adjustments are allowed
  if the geometry acceptance below requires them.
- `packages/zdtp/src/shell/header.tsx:ShellHeader`: remove
  `ACTIONS_MENU_BREAKPOINT_PX` and the `width` prop. Determine whether the actions
  trigger has a rendered box from `actionsMenuBtnRef` (computed display and
  nonzero bounding dimensions), not any JS width comparison. Observe the nearest
  owning `.tokenpanel-shell` and the trigger with `ResizeObserver`; recheck on
  initial setup, observation delivery and menu opening. Close an open menu when
  its trigger is no longer rendered. Disconnect on unmount. Keep measurement
  instance-local and close-only: returning to compact must not reopen the menu.
  Observing the trigger also covers display changes when its own size becomes
  zero; shell observation covers actual container changes without a Preact width
  prop update. Do not introduce a JS 479/480/481 replacement threshold.
- `packages/zdtp/src/panel.tsx:Panel`: remove the `ShellHeader width={...}` argument;
  preserve the `dock-modes` and `dock-modes-compact` registrations and
  `handleDockModeChange`. No region API change is needed.
- `packages/zdtp/src/shell/dock-mode-switch.tsx:DockModeSwitch` and
  `controls/actions-menu-popover.tsx:ActionsMenuPopover` are reused contracts;
  no redesign or production edits to them are expected.
- `packages/zdtp/src/__tests__/dock-modes.browser.test.tsx` and
  `packages/zdtp/src/__tests__/panel-header-responsive.browser.test.tsx` own the
  bounded automated regressions below.

## Required regression evidence

1. In `dock-modes.browser.test.tsx`, add browser-provider pointer coverage (real
   browser input, no native DOM `.click()`, forced click or dispatched mouse-event
   substitute in the regression path). Scope targets to the visible inline dock
   group to avoid its labeled menu copy. Start floating, pointer-dock right at
   440px, and pointer-select float, bottom and mini in separate transitions from
   right. Assert resulting shell/pill, persisted mode, released right inset/margin
   and expected bottom margin. Seed nonzero host margins in at least one case and
   assert their original values and priorities return. Inline escape must succeed
   with Panel actions closed throughout; this assertion fails on the baseline.
2. Cover restoration from persisted right mode and size via the existing panel
   lifecycle before pointer escape. Preserve shortcut, close, resize, host-restoration
   and mini-expand coverage. Test Enter and Space on the visible reused switch.
   Lifecycle remount is automated restoration coverage, not an actual page reload.
3. In `panel-header-responsive.browser.test.tsx`, verify right border-box widths
   320 and 440 contain the visible header/tabbar children, preserve at least 160px
   of tab strip, and keep all four inline dock targets rendered, non-overlapping,
   inside the shell and centre-hit-testable (`elementFromPoint` returns the
   control or its descendant). Keep the gear, close button and actions trigger
   visible and hit-testable. Keep the labeled popover choices and other existing
   compact controls reachable. Include a wide-shell control case.
4. Add a CSS-driven boundary regression: open the menu with real pointer input at
   right border-box 480px/content 479px, then change the actual shell style width
   to 481px/content 480px **without pointerdown and without changing panel width
   state**. Await the observer; assert hidden trigger, no popover and
   `aria-expanded=false`. Return to 480px: visible trigger, menu stays closed,
   real pointer can reopen it. Repeat the equivalent floating border-box
   481px/content 479px ->482px/content 480px transition (two horizontal borders).
   Assert measured borders/content sizes; never infer compactness from persisted
   width alone. Direct style changes deliberately isolate observation from the
   outside-pointer close handler and obsolete prop-based logic. Include mounted
   right widths 479,480,481,482 to guard the exact observed boundary.
5. Manager repeats the bounded #757 real-page probe on both manifests after
   implementation, retaining actual `page.reload()` while right-docked followed
   by pointer escape. Exercise inline float/bottom/mini choices, and separately
   Panel actions -> Float panel to preserve that route. Capture geometry, hit
   targets, persistence, margin release and browser errors. This is targeted
   acceptance evidence, not permission to add/run a full e2e suite. If the page
   cannot be checked under the authorized resource limits, report the missing
   evidence rather than claiming lifecycle tests prove reload.

Run only those two browser files and `pnpm --filter @takazudo/zdtp typecheck` for
implementation verification. No full suite, full build or e2e suite is required.
The decision itself is documentation-only and needs `git diff --check`.

## Alternatives rejected and residual risk

Overflow-only repair cannot explain a failure absent from both pointer probes
and leaves discoverability unchanged. An additional escape button or dock-picker
popover duplicates existing controls and adds interaction/state to crowded
chrome; reusing the icon strip is smaller. Removing labeled menu choices would
unnecessarily discard a working, understandable route. Hand-adjusting the JS
constant to 481 merely encodes another border assumption and misses rendered
size changes; observing CSS avoids the duplicated threshold altogether.

Arbitrary original-host overlays, deployed-version differences and persisted
runtime differences remain unproven possibilities. This change makes no promise
to defeat every host stylesheet. The original consumer URL and exact loaded
assets/state are still required to diagnose its reported failure. Future release
notes and issue closure must distinguish the defensive improvement and verified
boundary fix from that unreproduced report.
