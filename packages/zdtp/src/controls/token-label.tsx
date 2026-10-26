/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, Show } from '@takazudo/zfb/zudo-react';
import { read, type MaybeSignal } from '../zr/live';
import type { TooltipController } from './tooltip-controller';
import { tooltipTrigger } from './tooltip';

export interface TokenLabelProps {
  cssVar: MaybeSignal<string>;
  label?: MaybeSignal<string | undefined>;
  class?: string;
  tooltip: TooltipController | null;
}

/**
 * Renders a token-name label with the shared rich tooltip.
 * Replaces bare `<span title={cssVar}>` usages across all tabs so every
 * token-name display site uses the same `.tokenpanel-tooltip` primitive.
 *
 * The optional `label` sub-label is shown only when it differs from `cssVar`
 * (avoids redundant repetition for tokens whose label IS the cssVar).
 */
export function TokenLabel(props: TokenLabelProps) {
  const cssVar = computed(() => read(props.cssVar));
  const sub = computed(() => {
    const label = read(props.label);
    return label && label !== cssVar.value ? label : '';
  });
  return (
    <span
      class={props.class ?? 'tokenpanel-row-label'}
      {...tooltipTrigger(props.tooltip, cssVar, { anchor: 'text' })}
    >
      {cssVar}
      <Show when={computed(() => sub.value !== '')}>
        {() => <span class="tokenpanel-row-label-sub">{sub}</span>}
      </Show>
    </span>
  );
}

export default TokenLabel;
