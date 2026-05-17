/*
 * Forms demo page — Next.js example (#192).
 *
 * Demonstrates common form widget types styled entirely through --nx-*
 * design tokens. Token-to-class reference:
 *   .nx-input           → bg-surface, border-muted, focus:border-accent, rounded
 *   .nx-input:disabled  → bg-muted, cursor-not-allowed
 *   .nx-button.is-primary → submit button styling
 *   .nx-label           → field label text
 *   .nx-field           → label + input stack
 *   .nx-form            → form container (flex-col gap)
 *   .nx-form-section    → grouped form section
 *   .nx-subsection-title → section heading
 *   .nx-helper          → helper/hint text
 */

import AppShell from '../../_components/AppShell';
import { FormShell } from '../../_components/FormShell';

export default function FormsPage() {
  return (
    <AppShell activePath="/components/forms">
      <div className="nx-page">
        <div role="heading" aria-level={1} className="nx-page-title">
          Form controls demo
        </div>
        <div className="nx-body" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
          Each widget below is styled entirely with <code>nx-*</code> vocabulary
          classes that resolve to design tokens. Inputs use{' '}
          <code>.nx-input</code> for padding, corners, border, and focus states.
          Toggle any token in the Design Token Panel to see every widget update
          live.
        </div>

        {/* Form — demo-only; FormShell is a small client wrapper that calls
            event.preventDefault() so Enter in a field or clicking Submit
            does not navigate the route away from the showcase. Children stay
            server-rendered. */}
        <FormShell className="nx-form" style={{ marginTop: 'var(--nx-vsp-md)' }}>

          {/* ── Text input ─────────────────────────────────────────────── */}
          <div className="nx-form-section">
            <div role="heading" aria-level={2} className="nx-subsection-title">
              Text input
            </div>
            <div className="nx-helper">
              <code>.nx-input</code> background ·{' '}
              <code>border-muted</code> border ·{' '}
              <code>focus:border-accent</code> focus ring ·{' '}
              <code>rounded</code> corners
            </div>

            {/* Active (normal) */}
            <div className="nx-field">
              <label className="nx-label" htmlFor="input-text">
                Full name
              </label>
              <input
                id="input-text"
                type="text"
                placeholder="Jane Doe"
                className="nx-input"
              />
            </div>

            {/* Disabled */}
            <div className="nx-field">
              <label className="nx-label" htmlFor="input-text-disabled" style={{ color: 'var(--nx-color-muted)' }}>
                Full name (disabled)
              </label>
              <input
                id="input-text-disabled"
                type="text"
                placeholder="Jane Doe"
                disabled
                className="nx-input"
              />
              <div className="nx-helper">
                Disabled state: <code>.nx-input:disabled</code> &#8594;{' '}
                <code>background: --nx-color-muted</code>
              </div>
            </div>
          </div>

          {/* ── Email input ─────────────────────────────────────────────── */}
          <div className="nx-form-section">
            <div role="heading" aria-level={2} className="nx-subsection-title">
              Email input
            </div>
            <div className="nx-helper">
              Same <code>.nx-input</code> class; browser provides email-specific
              keyboard on mobile.
            </div>
            <div className="nx-field">
              <label className="nx-label" htmlFor="input-email">
                Email address
              </label>
              <input
                id="input-email"
                type="email"
                placeholder="jane@example.com"
                className="nx-input"
              />
            </div>
          </div>

          {/* ── Select ──────────────────────────────────────────────────── */}
          <div className="nx-form-section">
            <div role="heading" aria-level={2} className="nx-subsection-title">
              Select
            </div>
            <div className="nx-helper">
              Native chevron retained; same <code>.nx-input</code> token set as
              text input.
            </div>
            <div className="nx-field">
              <label className="nx-label" htmlFor="select-role">
                Role
              </label>
              <select id="select-role" className="nx-input">
                <option value="">Select a role&#x2026;</option>
                <option value="designer">Designer</option>
                <option value="engineer">Engineer</option>
                <option value="pm">Product manager</option>
              </select>
            </div>
          </div>

          {/* ── Textarea ────────────────────────────────────────────────── */}
          <div className="nx-form-section">
            <div role="heading" aria-level={2} className="nx-subsection-title">
              Textarea
            </div>
            <div className="nx-helper">
              {/* reason: visual minimum is component-local; below-token granularity */}
              <code>min-height: 6rem</code> is a component-local visual floor
              below token granularity.
            </div>
            <div className="nx-field">
              <label className="nx-label" htmlFor="textarea-bio">
                Bio
              </label>
              {/* reason: min-height 6rem is a visual default below token granularity */}
              <textarea
                id="textarea-bio"
                placeholder="Tell us about yourself&#x2026;"
                className="nx-input"
                style={{ minHeight: '6rem', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* ── Submit button ───────────────────────────────────────────── */}
          <div className="nx-form-section">
            <div role="heading" aria-level={2} className="nx-subsection-title">
              Submit button
            </div>
            <div className="nx-helper">
              <code>.nx-button.is-primary</code> fill &#8594;{' '}
              <code>--nx-color-primary</code>. Hover switches to accent.
            </div>
            <div>
              <button type="submit" className="nx-button is-primary">
                Submit form
              </button>
            </div>
          </div>

        </FormShell>
      </div>
    </AppShell>
  );
}
