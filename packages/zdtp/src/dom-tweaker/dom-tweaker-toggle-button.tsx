/**
 * DomTweakerToggleButton — header button that enables/disables DOM Tweaker.
 *
 * The full DOM editing UI/runtime lives behind the lazy boundary. This eager
 * control only flips the persisted enabled bit and triggers the first lazy
 * import through DomTweakerOrchestrator.
 */

import { useContext } from 'preact/hooks';
import type { JSX } from 'preact';
import { DomTweakerContext } from './dom-tweaker-context';
import { RoleButton } from '../controls/role-button';

export function DomTweakerToggleButton(): JSX.Element | null {
  const ctx = useContext(DomTweakerContext);
  if (ctx === null) return null;

  const { enabled, openDiffExport, runtimeStatus, toggle } = ctx;
  const runtimeLabel =
    runtimeStatus === 'loading'
      ? 'runtime loading'
      : runtimeStatus === 'ready'
        ? 'runtime ready'
        : runtimeStatus === 'error'
          ? 'runtime failed'
          : 'runtime not loaded';
  const title = enabled
    ? `DOM Tweaker: ON (${runtimeLabel}) — click to turn off.`
    : `DOM Tweaker: OFF (${runtimeLabel}) — click to enable.`;

  return (
    <>
      <RoleButton
        className={
          enabled
            ? `tokenpanel-domtweaker-toggle is-active is-${runtimeStatus}`
            : `tokenpanel-domtweaker-toggle is-${runtimeStatus}`
        }
        aria-label={`Toggle DOM Tweaker (${runtimeLabel})`}
        ariaProps={{
          'aria-pressed': enabled,
          'aria-busy': runtimeStatus === 'loading' ? true : undefined,
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
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
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
        <span
          className={`tokenpanel-domtweaker-toggle__status is-${runtimeStatus}`}
          aria-hidden="true"
        />
      </RoleButton>
      <RoleButton
        className="tokenpanel-domtweaker-diff-button"
        aria-label="Open DOM Tweaker diff export"
        title="Open DOM Tweaker diff export"
        onClick={openDiffExport}
      >
        <span aria-hidden="true">±</span>
      </RoleButton>
    </>
  );
}
