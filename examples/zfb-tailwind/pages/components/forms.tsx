/**
 * Forms demo page — zfb + Tailwind v4.
 *
 * Demonstrates all common form widget types with every colour, spacing,
 * and shape styled exclusively through Tailwind utilities that resolve to
 * design tokens declared in global.css.
 *
 * Token-to-utility reference (§131.1):
 *   bg-surface          → --zfbtw-color-surface   (input bg)
 *   bg-primary          → --zfbtw-color-primary    (submit btn bg)
 *   bg-muted            → --zfbtw-color-muted      (disabled bg)
 *   text-fg             → --zfbtw-fg               (input text)
 *   text-bg             → --zfbtw-bg               (btn text)
 *   text-muted          → --zfbtw-color-muted      (helper/hint)
 *   text-body           → --zfbtw-text-body        (input font-size)
 *   text-small          → --zfbtw-text-small       (helper label)
 *   text-h4             → --zfbtw-text-h4          (section heading)
 *   border-muted        → --zfbtw-color-muted      (resting border)
 *   focus:border-accent → --zfbtw-color-accent     (focus border)
 *   disabled:bg-muted   → --zfbtw-color-muted      (disabled bg)
 *   p-spacing-sm        → --zfbtw-spacing-sm       (input/btn padding)
 *   rounded-md          → --zfbtw-radius           (corners)
 *   gap-spacing-xs      → --zfbtw-spacing-xs       (label-control gap)
 *   gap-spacing-md      → --zfbtw-spacing-md       (between field groups)
 */

import { AppShell } from '../../components/app-shell';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

/** Shared classes for all text inputs, email inputs, selects, textareas. */
const inputBase =
  'bg-surface border border-muted focus:border-accent focus:outline-none rounded-md p-spacing-sm text-body text-fg w-full';

export default function FormsPage() {
  return (
    <AppShell
      title="Forms — zfb + Tailwind v4 — Design Token Panel"
      activePath={`${BASE_PATH}components/forms/`}
    >
      {/* Page heading */}
      <h1 class="text-h2 text-primary">Form controls demo</h1>

      {/* §131.3 required intro paragraph */}
      <p class="text-body text-fg leading-relaxed mt-vsp-sm">
        Each widget below is styled entirely with Tailwind utilities that
        resolve to design tokens. Inputs use <code class="font-mono text-small">spacing-sm</code> for
        padding, <code class="font-mono text-small">radius</code> for corners,{' '}
        <code class="font-mono text-small">color-muted</code> for borders,{' '}
        <code class="font-mono text-small">color-accent</code> on focus,{' '}
        <code class="font-mono text-small">color-danger</code> on error. Toggle
        any token in the Design Token Panel to see every widget update live.
      </p>

      {/* Form — SSR-only; inputs accept user input natively; no submit handler needed */}
      <form
        class="flex flex-col gap-spacing-md mt-vsp-md"
        onSubmit={(e) => e.preventDefault()}
      >
        {/* ── Text input ─────────────────────────────────────────────── */}
        <section class="flex flex-col gap-spacing-xs">
          <h2 class="text-h4 text-fg font-semibold">Text input</h2>
          <p class="text-small text-muted">
            <code class="font-mono">bg-surface</code> background ·{' '}
            <code class="font-mono">border-muted</code> border ·{' '}
            <code class="font-mono">focus:border-accent</code> focus ring ·{' '}
            <code class="font-mono">rounded-md</code> corners
          </p>

          {/* Active (normal) */}
          <div class="flex flex-col gap-spacing-xs">
            <label class="text-body text-fg" for="input-text">
              Full name
            </label>
            <input
              id="input-text"
              type="text"
              placeholder="Jane Doe"
              class={inputBase}
            />
          </div>

          {/* Disabled — demonstrates disabled:bg-muted (§131.1, criterion #4) */}
          <div class="flex flex-col gap-spacing-xs">
            <label class="text-body text-muted" for="input-text-disabled">
              Full name (disabled)
            </label>
            <input
              id="input-text-disabled"
              type="text"
              placeholder="Jane Doe"
              disabled
              class={`${inputBase} disabled:bg-muted cursor-not-allowed`}
            />
            <span class="text-small text-muted">
              Disabled state: <code class="font-mono">disabled:bg-muted</code> →
              <code class="font-mono"> --zfbtw-color-muted</code>
            </span>
          </div>
        </section>

        {/* ── Email input ─────────────────────────────────────────────── */}
        <section class="flex flex-col gap-spacing-xs">
          <h2 class="text-h4 text-fg font-semibold">Email input</h2>
          <p class="text-small text-muted">
            Same utility set as text input; browser provides email-specific
            keyboard on mobile.
          </p>
          <div class="flex flex-col gap-spacing-xs">
            <label class="text-body text-fg" for="input-email">
              Email address
            </label>
            <input
              id="input-email"
              type="email"
              placeholder="jane@example.com"
              class={inputBase}
            />
          </div>
        </section>

        {/* ── Select ─────────────────────────────────────────────────── */}
        <section class="flex flex-col gap-spacing-xs">
          <h2 class="text-h4 text-fg font-semibold">Select</h2>
          <p class="text-small text-muted">
            Native chevron retained (no <code class="font-mono">appearance-none</code>);
            same token set as text input.
          </p>
          <div class="flex flex-col gap-spacing-xs">
            <label class="text-body text-fg" for="select-role">
              Role
            </label>
            <select id="select-role" class={inputBase}>
              <option value="">Select a role…</option>
              <option value="designer">Designer</option>
              <option value="engineer">Engineer</option>
              <option value="pm">Product manager</option>
            </select>
          </div>
        </section>

        {/* ── Textarea ────────────────────────────────────────────────── */}
        <section class="flex flex-col gap-spacing-xs">
          <h2 class="text-h4 text-fg font-semibold">Textarea</h2>
          <p class="text-small text-muted">
            <code class="font-mono">min-h-[6rem]</code> arbitrary value —{' '}
            {/* reason: visual minimum is component-local; below-token granularity */}
            visual floor ensures usable initial height.
          </p>
          <div class="flex flex-col gap-spacing-xs">
            <label class="text-body text-fg" for="textarea-bio">
              Bio
            </label>
            {/* min-h-[6rem]: reason: visual default; component-local minimum below token granularity */}
            <textarea
              id="textarea-bio"
              placeholder="Tell us about yourself…"
              class={`${inputBase} min-h-[6rem] resize-y`}
            />
          </div>
        </section>

        {/* ── Checkbox group ──────────────────────────────────────────── */}
        <section class="flex flex-col gap-spacing-xs">
          <h2 class="text-h4 text-fg font-semibold">Checkbox group</h2>
          <p class="text-small text-muted">
            Native checkbox with{' '}
            <code class="font-mono">accent-color</code> set to{' '}
            <code class="font-mono">--zfbtw-color-accent</code>.
            No Tailwind utility maps to <code class="font-mono">accent-color</code>{' '}
            in §131.1, so the value is applied via inline style.
          </p>
          <fieldset class="flex flex-col gap-spacing-xs border-none p-0 m-0">
            <legend class="text-body text-fg mb-spacing-xs">Interests</legend>
            {[
              { id: 'cb-design', label: 'Design systems' },
              { id: 'cb-tokens', label: 'Design tokens' },
              { id: 'cb-tailwind', label: 'Tailwind CSS' },
            ].map(({ id, label }) => (
              <label key={id} class="inline-flex items-center gap-spacing-xs cursor-pointer text-body text-fg">
                {/* reason: no Tailwind utility for accent-color in §131.1 allowlist */}
                <input
                  type="checkbox"
                  id={id}
                  style={{ accentColor: 'var(--zfbtw-color-accent)' }}
                />
                {label}
              </label>
            ))}
          </fieldset>
        </section>

        {/* ── Radio group ─────────────────────────────────────────────── */}
        <section class="flex flex-col gap-spacing-xs">
          <h2 class="text-h4 text-fg font-semibold">Radio group</h2>
          <p class="text-small text-muted">
            Same <code class="font-mono">accent-color</code> inline-style pattern as
            checkboxes.
          </p>
          <fieldset class="flex flex-col gap-spacing-xs border-none p-0 m-0">
            <legend class="text-body text-fg mb-spacing-xs">Preferred theme</legend>
            {[
              { id: 'radio-dark', label: 'Dark' },
              { id: 'radio-light', label: 'Light' },
              { id: 'radio-system', label: 'System default' },
            ].map(({ id, label }) => (
              <label key={id} class="inline-flex items-center gap-spacing-xs cursor-pointer text-body text-fg">
                {/* reason: no Tailwind utility for accent-color in §131.1 allowlist */}
                <input
                  type="radio"
                  id={id}
                  name="theme"
                  style={{ accentColor: 'var(--zfbtw-color-accent)' }}
                />
                {label}
              </label>
            ))}
          </fieldset>
        </section>

        {/* ── Range slider ────────────────────────────────────────────── */}
        <section class="flex flex-col gap-spacing-xs">
          <h2 class="text-h4 text-fg font-semibold">Range slider</h2>
          <p class="text-small text-muted">
            <code class="font-mono">w-full</code> width ·{' '}
            <code class="font-mono">accent-color</code> fills the track and thumb
            with <code class="font-mono">color-accent</code>.
          </p>
          <div class="flex flex-col gap-spacing-xs">
            <label class="text-body text-fg" for="range-opacity">
              Opacity
            </label>
            {/* reason: no Tailwind utility for accent-color in §131.1 allowlist */}
            <input
              id="range-opacity"
              type="range"
              min="0"
              max="100"
              defaultValue="60"
              class="w-full cursor-pointer"
              style={{ accentColor: 'var(--zfbtw-color-accent)' }}
            />
            <span class="text-small text-muted">0 – 100</span>
          </div>
        </section>

        {/* ── Submit button ───────────────────────────────────────────── */}
        <section class="flex flex-col gap-spacing-xs">
          <h2 class="text-h4 text-fg font-semibold">Submit button</h2>
          <p class="text-small text-muted">
            <code class="font-mono">bg-primary</code> fill ·{' '}
            <code class="font-mono">text-bg</code> label ·{' '}
            <code class="font-mono">hover:bg-accent</code> hover ·{' '}
            <code class="font-mono">p-spacing-sm</code> padding ·{' '}
            <code class="font-mono">rounded-md</code> corners.
          </p>
          <div>
            <button
              type="submit"
              class="bg-primary text-bg px-spacing-sm py-spacing-sm rounded-md hover:bg-accent cursor-pointer text-body border-none"
            >
              Submit form
            </button>
          </div>
        </section>
      </form>
    </AppShell>
  );
}
