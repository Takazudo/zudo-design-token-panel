/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope } from '@takazudo/zfb/zudo-react';
import type { Live } from '../live';

export interface WidgetProps {
  label: string;
  count: number;
  onPick: (value: string) => void;
}

export const widgetCleanups: string[] = [];

/** Fixture zudo-react component for the bridge tests. */
export function Widget({ label, count, onPick }: Live<WidgetProps, 'onPick'>) {
  getScope().onCleanup(() => widgetCleanups.push(label.value));
  return (
    <div class="widget" data-count={count} on:click={() => onPick(label.value)}>
      {label} × {computed(() => String(count.value))}
    </div>
  );
}
