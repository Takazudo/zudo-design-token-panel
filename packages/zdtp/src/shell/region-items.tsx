/** @jsxImportSource @takazudo/zfb/zudo-react */
import { For, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { Rebuild } from '../zr/rebuild';
import type { ShellRegionItem, ShellRegionRenderContext } from './regions';

/** Render region items in order; an item is re-rendered only when replaced. */
export function RegionItems({
  items,
  context,
}: {
  items: ReadonlySignal<readonly ShellRegionItem[]>;
  context: ShellRegionRenderContext;
}) {
  return (
    <For each={items} by={(item) => item.id}>
      {(item) => <Rebuild value={item}>{(current) => current.render(context)}</Rebuild>}
    </For>
  );
}
