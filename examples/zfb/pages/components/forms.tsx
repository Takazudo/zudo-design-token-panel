/**
 * Forms demo page — zfb plain CSS.
 *
 * Plain CSS mirror of zfb-tailwind/pages/components/forms.tsx (#138).
 * Tailwind utilities replaced by .zfbexample-form-* classes from global.css.
 *
 * Token-to-class reference (§138.1):
 *   .zfbexample-form-input      → bg: color-surface; border: color-muted; focus: color-accent; p: spacing-sm; radius; text-body; fg
 *   .zfbexample-form-input:disabled → bg: color-muted; cursor-not-allowed
 *   .zfbexample-form-submit     → bg: color-primary; text: bg; p: spacing-sm; radius; hover: color-accent
 *   .zfbexample-form-checkbox/radio → accent-color: color-accent
 *   .zfbexample-form-range      → accent-color: color-accent; width: 100%
 */

import { AppShell } from '../../components/app-shell';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb/';

export default function FormsPage() {
  return (
    <AppShell
      title="Forms — zfb — Design Token Panel"
      activePath={`${BASE_PATH}components/forms/`}
    >
      {/* Page heading */}
      <h1 class="zfbexample-section-h2" style={{ marginBottom: 'var(--zfbexample-vsp-sm)' }}>
        Form controls demo
      </h1>

      {/* Intro paragraph */}
      <p class="zfbexample-body-text" style={{ marginBottom: 'var(--zfbexample-vsp-md)', lineHeight: 'var(--zfbexample-leading-relaxed)' }}>
        Each widget below is styled with plain CSS classes that resolve to design
        tokens. Inputs use <code>spacing-sm</code> for padding, <code>radius</code>{' '}
        for corners, <code>color-muted</code> for borders,{' '}
        <code>color-accent</code> on focus. Toggle any token in the Design Token
        Panel to see every widget update live.
      </p>

      {/* Form — SSR-only; inputs accept user input natively; no submit handler needed */}
      <form class="zfbexample-form" onSubmit={(e) => e.preventDefault()}>

        {/* ── Text input ────────────────────────────────────────────────── */}
        <section class="zfbexample-field-group">
          <h2 class="zfbexample-section-h4">Text input</h2>
          <p class="zfbexample-muted-text">
            <code>bg: color-surface</code> · <code>border: color-muted</code> ·{' '}
            <code>focus: color-accent</code> · <code>radius</code>
          </p>

          {/* Active (normal) */}
          <div class="zfbexample-form-field">
            <label class="zfbexample-form-label" for="input-text">Full name</label>
            <input
              id="input-text"
              type="text"
              placeholder="Jane Doe"
              class="zfbexample-form-input"
            />
          </div>

          {/* Disabled */}
          <div class="zfbexample-form-field">
            <label class="zfbexample-form-label zfbexample-form-label--muted" for="input-text-disabled">
              Full name (disabled)
            </label>
            <input
              id="input-text-disabled"
              type="text"
              placeholder="Jane Doe"
              disabled
              class="zfbexample-form-input"
            />
            <span class="zfbexample-form-helper">
              Disabled state: <code>:disabled</code> → <code>bg: color-muted</code>
            </span>
          </div>
        </section>

        {/* ── Email input ───────────────────────────────────────────────── */}
        <section class="zfbexample-field-group">
          <h2 class="zfbexample-section-h4">Email input</h2>
          <p class="zfbexample-muted-text">
            Same class set as text input; browser provides email-specific keyboard on mobile.
          </p>
          <div class="zfbexample-form-field">
            <label class="zfbexample-form-label" for="input-email">Email address</label>
            <input
              id="input-email"
              type="email"
              placeholder="jane@example.com"
              class="zfbexample-form-input"
            />
          </div>
        </section>

        {/* ── Select ───────────────────────────────────────────────────── */}
        <section class="zfbexample-field-group">
          <h2 class="zfbexample-section-h4">Select</h2>
          <p class="zfbexample-muted-text">
            Native chevron retained; same token set as text input.
          </p>
          <div class="zfbexample-form-field">
            <label class="zfbexample-form-label" for="select-role">Role</label>
            <select id="select-role" class="zfbexample-form-select">
              <option value="">Select a role…</option>
              <option value="designer">Designer</option>
              <option value="engineer">Engineer</option>
              <option value="pm">Product manager</option>
            </select>
          </div>
        </section>

        {/* ── Textarea ─────────────────────────────────────────────────── */}
        <section class="zfbexample-field-group">
          <h2 class="zfbexample-section-h4">Textarea</h2>
          <p class="zfbexample-muted-text">
            {/* reason: visual minimum is component-local; below-token granularity */}
            <code>min-height: 6rem</code> — visual floor ensures usable initial height.
          </p>
          <div class="zfbexample-form-field">
            <label class="zfbexample-form-label" for="textarea-bio">Bio</label>
            <textarea
              id="textarea-bio"
              placeholder="Tell us about yourself…"
              class="zfbexample-form-textarea"
            />
          </div>
        </section>

        {/* ── Checkbox group ────────────────────────────────────────────── */}
        <section class="zfbexample-field-group">
          <h2 class="zfbexample-section-h4">Checkbox group</h2>
          <p class="zfbexample-muted-text">
            Native checkbox with <code>accent-color</code> set to{' '}
            <code>--zfbexample-color-accent</code> via{' '}
            <code>.zfbexample-form-checkbox</code>.
          </p>
          <fieldset class="zfbexample-form-fieldset">
            <legend class="zfbexample-form-label" style={{ marginBottom: 'var(--zfbexample-spacing-xs)' }}>
              Interests
            </legend>
            {[
              { id: 'cb-design', label: 'Design systems' },
              { id: 'cb-tokens', label: 'Design tokens' },
              { id: 'cb-css', label: 'CSS custom properties' },
            ].map(({ id, label }) => (
              <label key={id} class="zfbexample-form-check-label">
                <input type="checkbox" id={id} class="zfbexample-form-checkbox" />
                {label}
              </label>
            ))}
          </fieldset>
        </section>

        {/* ── Radio group ───────────────────────────────────────────────── */}
        <section class="zfbexample-field-group">
          <h2 class="zfbexample-section-h4">Radio group</h2>
          <p class="zfbexample-muted-text">
            Same <code>accent-color</code> pattern as checkboxes via{' '}
            <code>.zfbexample-form-radio</code>.
          </p>
          <fieldset class="zfbexample-form-fieldset">
            <legend class="zfbexample-form-label" style={{ marginBottom: 'var(--zfbexample-spacing-xs)' }}>
              Preferred theme
            </legend>
            {[
              { id: 'radio-dark', label: 'Dark' },
              { id: 'radio-light', label: 'Light' },
              { id: 'radio-system', label: 'System default' },
            ].map(({ id, label }) => (
              <label key={id} class="zfbexample-form-check-label">
                <input type="radio" id={id} name="theme" class="zfbexample-form-radio" />
                {label}
              </label>
            ))}
          </fieldset>
        </section>

        {/* ── Range slider ──────────────────────────────────────────────── */}
        <section class="zfbexample-field-group">
          <h2 class="zfbexample-section-h4">Range slider</h2>
          <p class="zfbexample-muted-text">
            <code>accent-color</code> fills track and thumb via{' '}
            <code>.zfbexample-form-range</code> → <code>color-accent</code>.
          </p>
          <div class="zfbexample-form-field">
            <label class="zfbexample-form-label" for="range-opacity">Opacity</label>
            <input
              id="range-opacity"
              type="range"
              min="0"
              max="100"
              defaultValue="60"
              class="zfbexample-form-range"
            />
            <span class="zfbexample-form-helper">0 – 100</span>
          </div>
        </section>

        {/* ── Submit button ──────────────────────────────────────────────── */}
        <section class="zfbexample-field-group">
          <h2 class="zfbexample-section-h4">Submit button</h2>
          <p class="zfbexample-muted-text">
            <code>bg: color-primary</code> · <code>text: bg</code> ·{' '}
            <code>hover: color-accent</code> · <code>p: spacing-sm</code> · <code>radius</code>
          </p>
          <div>
            <button type="submit" class="zfbexample-form-submit">
              Submit form
            </button>
          </div>
        </section>

      </form>
    </AppShell>
  );
}
