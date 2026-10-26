/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * DomTweakerToggleButton — header button that enables/disables DOM Tweaker.
 *
 * The full DOM editing UI/runtime lives behind the lazy boundary. This eager
 * control only flips the persisted enabled bit and triggers the first lazy
 * import through the DOM Tweaker controller.
 */

import { computed } from '@takazudo/zfb/zudo-react';
import type { DomTweakerController } from './dom-tweaker-context';
import { RoleButton } from '../controls/role-button';

export interface DomTweakerToggleButtonProps {
  controller: DomTweakerController | null;
  compact?: boolean;
}

export function DomTweakerToggleButton({ controller, compact = false }: DomTweakerToggleButtonProps) {
  if (controller === null) return null;

  const { enabled, openDiffExport, runtimeStatus, toggle } = controller;
  const runtimeLabel = computed(() => {
    const status = runtimeStatus.value;
    return status === 'loading'
      ? 'runtime loading'
      : status === 'ready'
        ? 'runtime ready'
        : status === 'error'
          ? 'runtime failed'
          : 'runtime not loaded';
  });
  const title = computed(() => (enabled.value
    ? `DOM Tweaker: ON (${runtimeLabel.value}) — click to turn off.`
    : `DOM Tweaker: OFF (${runtimeLabel.value}) — click to enable.`));

  return [
    <RoleButton
      class={computed(() => (enabled.value
        ? `tokenpanel-tweaker-toggle tokenpanel-domtweaker-toggle is-active is-${runtimeStatus.value}`
        : `tokenpanel-tweaker-toggle tokenpanel-domtweaker-toggle is-${runtimeStatus.value}`))}
      aria-label={computed(() => `Toggle DOM Tweaker (${runtimeLabel.value})`)}
      ariaProps={{
        'aria-pressed': enabled,
        'aria-busy': computed(() => (runtimeStatus.value === 'loading' ? true : null)),
      }}
      title={title}
      onClick={toggle}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 7h16" />
        <path d="M7 4v6" />
        <path d="M17 4v6" />
        <path d="M6 14h12" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 20h6" />
      </svg>
      {compact ? <span>DOM Tweaker</span> : null}
      <span
        class={computed(() => `tokenpanel-domtweaker-toggle__status is-${runtimeStatus.value}`)}
        aria-hidden="true"
      />
    </RoleButton>,
    compact ? null : (
      <RoleButton
        class="tokenpanel-tweaker-diff-button tokenpanel-domtweaker-diff-button"
        aria-label="Open DOM Tweaker diff export"
        title="Open DOM Tweaker diff export"
        onClick={openDiffExport}
      >
        <span aria-hidden="true">±</span>
      </RoleButton>
    ),
  ];
}
