# Wave-3 feature plugging

The foundation shell exposes three small seams for later features:

- S3 row contributions extend a `FlatTab` without forking `TokenRow`.
- S18 shell regions and shortcuts add chrome without growing the core header.
- S19 `commitTweakState` is the panel's token-state mutation path; it also
  records the identity-aware history entry used by later undo/redo features.

## Shell chrome

`DesignTokenTweakPanel` creates the shell's region registry
(`createShellRegions`) and shortcut dispatcher (`createShortcutDispatcher`) and
passes them down explicitly — zudo-react has no context. A feature rendered
inside the panel registers one item for its lifetime with
`useRegisterRegionItem`, called during component setup:

```tsx
import { RoleButton } from '../controls/role-button';
import { useRegisterRegionItem, type ShellRegions } from './regions';

function FeatureChrome({ regions, onOpen }: { regions: ShellRegions; onOpen: () => void }) {
  useRegisterRegionItem(regions, 'header-actions', {
    id: 'feature-open',
    order: 20,
    // header-actions are visible in the wide header; compactAction supplies
    // the same command to the narrow-panel actions popover.
    render: () => (
      <RoleButton
        class="tokenpanel-feature-action"
        onClick={onOpen}
        data-zdtp-action="feature-open"
      >
        Feature
      </RoleButton>
    ),
    compactAction: { id: 'feature-open', label: 'Feature', onSelect: onOpen },
  });
  return null;
}
```

The available regions are `header-actions`, `header-right`, `tabbar-extras`,
and `footer`. `order` is ascending, and an identical `id` replaces a previous
registration, and the item is removed when the registering component unmounts.
`render` runs once per mount of the region, so read signals inside it for live
values; it may inspect `{ compact, closeCompactMenu }` when a feature needs
different compact markup. Use the
`RoleButton` primitive for every button-like control so the panel's DOM and
keyboard contract stays intact.

`compactAction.id` is **required**. It is a stable action id — never a slug of
the display label — and the popover emits it as `data-zdtp-action="<id>"` so
consumer tests can select the action without depending on its label. Pass the
same id to the `render` side's `RoleButton` via `data-zdtp-action` so both
affordances carry an identical hook. Note that `ShellHeader` always renders the
header-actions row and the container query only hides it with `display: none`,
so while the compact popover is open **two** elements share the id — the hidden
header control and the popover item. See `PORTABLE-CONTRACT.md` §7.6.

Register shortcuts with `useShortcut`, passing the panel's dispatcher. The
dispatcher routes a shortcut to the last-interacted open shell, ignores editable
targets outside that shell, and removes the registration on unmount (or while
the optional `enabled` signal is false):

```tsx
useShortcut(
  shortcuts,
  { key: 'k', when: (event) => (event.metaKey || event.ctrlKey) && !event.shiftKey },
  (event) => {
    event.preventDefault();
    onOpen();
  },
);
```

## Rows and state

Pass a `RowContribution[]` to `FlatTab`. Each contribution receives the full
`FlatTabEntry` (`address`, `item`, `tier`, `tab`, `value`) and can provide a
`filter`, `leading`, `trailing`, `tail`, `className`, or `tierHeadingExtra`.
Filters combine with AND; keep contribution `id`s stable and append them in the
desired render order. Do not add a second heading inside a tier.

When a contribution changes panel state, call the transaction hook supplied by
the panel integration rather than writing the state signal, calling the persist
helpers, or calling a state slice helper directly:

```tsx
commitTweakState(
  'feature-adjust',
  (previous) => ({
    ...previous,
    tabs: {
      ...previous.tabs,
      feature: {
        ...previous.tabs?.feature,
        raw: {
          ...previous.tabs?.feature?.raw,
          item: nextValue,
        },
      },
    },
  }),
  { address: 'tabs.feature.raw.item' },
);
```

The default transaction applies the complete state, persists it under the
instance prefix, and records history. Use `address` for a stable leaf when
successive edits should coalesce; use `record: false` only for a deliberate
non-history update. Preserve the mounted instance config when calling the
transaction so color identity, storage, and apply routing remain scoped to the
right panel.

Every new markup and stylesheet rule remains subject to the package DOM-hygiene
rules: use `div`/`span` with ARIA roles instead of host-stylable semantic tags,
keep chrome variables under `--tokentweak-*`, and never add collapse-by-default
token sections.
