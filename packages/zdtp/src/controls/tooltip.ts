import { read, type MaybeSignal } from '../zr/live';
import type { TooltipController, TooltipOptions } from './tooltip-controller';

/** `on:` listeners that drive the shared tooltip from a zudo-react trigger. */
export function tooltipTrigger(
  controller: TooltipController | null | undefined,
  text: MaybeSignal<string>,
  options?: TooltipOptions,
) {
  const show = (event: Event) => {
    controller?.show(event.currentTarget as HTMLElement, read(text), options);
  };
  const hide = (event: Event) => {
    controller?.hide(event.currentTarget as HTMLElement);
  };
  return {
    'on:mouseenter': show,
    'on:mouseleave': hide,
    'on:focusin': show,
    'on:focusout': hide,
  };
}
