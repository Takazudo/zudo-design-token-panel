/**
 * Forms demo page — zfb plain CSS.
 *
 * Plain CSS mirror of zfb-tailwind/pages/components/forms.tsx (#138).
 * Tailwind utilities replaced by .zfb-form-* classes from global.css.
 *
 * Token-to-class reference (§138.1):
 *   .zfb-form-input      → bg: color-surface; border: color-muted; focus: color-accent; p: spacing-sm; radius; text-body; fg
 *   .zfb-form-input:disabled → bg: color-muted; cursor-not-allowed
 *   .zfb-form-submit     → bg: color-primary; text: bg; p: spacing-sm; radius; hover: color-accent
 *   .zfb-form-checkbox/radio → accent-color: color-accent
 *   .zfb-form-range      → accent-color: color-accent; width: 100%
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
      <h1 class="zfb-section-h2" style={{ marginBottom: 'var(--zfb-vsp-sm)' }}>
        Form controls demo
      </h1>

      {/* Intro paragraph */}
      <p class="zfb-body-text" style={{ marginBottom: 'var(--zfb-vsp-md)', lineHeight: 'var(--zfb-leading-relaxed)' }}>
        Each widget below is styled with plain CSS classes that resolve to design
        tokens. Inputs use <code>spacing-sm</code> for padding, <code>radius</code>{' '}
        for corners, <code>color-muted</code> for borders,{' '}
        <code>color-accent</code> on focus. Toggle any token in the Design Token
        Panel to see every widget update live.
      </p>

      {/* Form — SSR-only; inputs accept user input natively; no submit handler needed */}
      <form class="zfb-form" onSubmit={(e) => e.preventDefault()}>

        {/* ── Text input ────────────────────────────────────────────────── */}
        <section class="zfb-field-group">
          <h2 class="zfb-section-h4">Text input</h2>
          <p class="zfb-muted-text">
            <code>bg: color-surface</code> · <code>border: color-muted</code> ·{' '}
            <code>focus: color-accent</code> · <code>radius</code>
          </p>

          {/* Active (normal) */}
          <div class="zfb-form-field">
            <label class="zfb-form-label" for="input-text">Full name</label>
            <input
              id="input-text"
              type="text"
              placeholder="Jane Doe"
              class="zfb-form-input"
            />
          </div>

          {/* Disabled */}
          <div class="zfb-form-field">
            <label class="zfb-form-label zfb-form-label--muted" for="input-text-disabled">
              Full name (disabled)
            </label>
            <input
              id="input-text-disabled"
              type="text"
              placeholder="Jane Doe"
              disabled
              class="zfb-form-input"
            />
            <span class="zfb-form-helper">
              Disabled state: <code>:disabled</code> → <code>bg: color-muted</code>
            </span>
          </div>
        </section>

        {/* ── Email input ───────────────────────────────────────────────── */}
        <section class="zfb-field-group">
          <h2 class="zfb-section-h4">Email input</h2>
          <p class="zfb-muted-text">
            Same class set as text input; browser provides email-specific keyboard on mobile.
          </p>
          <div class="zfb-form-field">
            <label class="zfb-form-label" for="input-email">Email address</label>
            <input
              id="input-email"
              type="email"
              placeholder="jane@example.com"
              class="zfb-form-input"
            />
          </div>
        </section>

        {/* ── Select ───────────────────────────────────────────────────── */}
        <section class="zfb-field-group">
          <h2 class="zfb-section-h4">Select</h2>
          <p class="zfb-muted-text">
            Native chevron retained; same token set as text input.
          </p>
          <div class="zfb-form-field">
            <label class="zfb-form-label" for="select-role">Role</label>
            <select id="select-role" class="zfb-form-select">
              <option value="">Select a role…</option>
              <option value="designer">Designer</option>
              <option value="engineer">Engineer</option>
              <option value="pm">Product manager</option>
            </select>
          </div>
        </section>

        {/* ── Textarea ─────────────────────────────────────────────────── */}
        <section class="zfb-field-group">
          <h2 class="zfb-section-h4">Textarea</h2>
          <p class="zfb-muted-text">
            {/* reason: visual minimum is component-local; below-token granularity */}
            <code>min-height: 6rem</code> — visual floor ensures usable initial height.
          </p>
          <div class="zfb-form-field">
            <label class="zfb-form-label" for="textarea-bio">Bio</label>
            <textarea
              id="textarea-bio"
              placeholder="Tell us about yourself…"
              class="zfb-form-textarea"
            />
          </div>
        </section>

        {/* ── Checkbox group ────────────────────────────────────────────── */}
        <section class="zfb-field-group">
          <h2 class="zfb-section-h4">Checkbox group</h2>
          <p class="zfb-muted-text">
            Native checkbox with <code>accent-color</code> set to{' '}
            <code>--zfb-color-accent</code> via{' '}
            <code>.zfb-form-checkbox</code>.
          </p>
          <fieldset class="zfb-form-fieldset">
            <legend class="zfb-form-label" style={{ marginBottom: 'var(--zfb-spacing-xs)' }}>
              Interests
            </legend>
            {[
              { id: 'cb-design', label: 'Design systems' },
              { id: 'cb-tokens', label: 'Design tokens' },
              { id: 'cb-css', label: 'CSS custom properties' },
            ].map(({ id, label }) => (
              <label key={id} class="zfb-form-check-label">
                <input type="checkbox" id={id} class="zfb-form-checkbox" />
                {label}
              </label>
            ))}
          </fieldset>
        </section>

        {/* ── Radio group ───────────────────────────────────────────────── */}
        <section class="zfb-field-group">
          <h2 class="zfb-section-h4">Radio group</h2>
          <p class="zfb-muted-text">
            Same <code>accent-color</code> pattern as checkboxes via{' '}
            <code>.zfb-form-radio</code>.
          </p>
          <fieldset class="zfb-form-fieldset">
            <legend class="zfb-form-label" style={{ marginBottom: 'var(--zfb-spacing-xs)' }}>
              Preferred theme
            </legend>
            {[
              { id: 'radio-dark', label: 'Dark' },
              { id: 'radio-light', label: 'Light' },
              { id: 'radio-system', label: 'System default' },
            ].map(({ id, label }) => (
              <label key={id} class="zfb-form-check-label">
                <input type="radio" id={id} name="theme" class="zfb-form-radio" />
                {label}
              </label>
            ))}
          </fieldset>
        </section>

        {/* ── Range slider ──────────────────────────────────────────────── */}
        <section class="zfb-field-group">
          <h2 class="zfb-section-h4">Range slider</h2>
          <p class="zfb-muted-text">
            <code>accent-color</code> fills track and thumb via{' '}
            <code>.zfb-form-range</code> → <code>color-accent</code>.
          </p>
          <div class="zfb-form-field">
            <label class="zfb-form-label" for="range-opacity">Opacity</label>
            <input
              id="range-opacity"
              type="range"
              min="0"
              max="100"
              defaultValue="60"
              class="zfb-form-range"
            />
            <span class="zfb-form-helper">0 – 100</span>
          </div>
        </section>

        {/* ── Submit button ──────────────────────────────────────────────── */}
        <section class="zfb-field-group">
          <h2 class="zfb-section-h4">Submit button</h2>
          <p class="zfb-muted-text">
            <code>bg: color-primary</code> · <code>text: bg</code> ·{' '}
            <code>hover: color-accent</code> · <code>p: spacing-sm</code> · <code>radius</code>
          </p>
          <div>
            <button type="submit" class="zfb-form-submit">
              Submit form
            </button>
          </div>
        </section>

      </form>
    </AppShell>
  );
}
