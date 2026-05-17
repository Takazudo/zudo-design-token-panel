/**
 * Forms page — form control demos for the Vite + React example.
 *
 * Demonstrates text input, email input, select, textarea, disabled input,
 * and submit button. All styled through --vr-* design token vocabulary so
 * panel tweaks update every widget live.
 *
 * Token consumption:
 *   .vr-page            → layout container
 *   .vr-page-title      → page heading
 *   .vr-section-title   → widget section headings
 *   .vr-body / .vr-helper → text variants
 *   .vr-field           → flex-col wrapper for label + control
 *   .vr-label           → input label (text-body, fg)
 *   .vr-label.is-muted  → disabled label (text-body, muted)
 *   .vr-input           → all text/email/select/textarea inputs
 *   .vr-button.is-primary → submit button
 */

export function Forms() {
  return (
    <div className="vr-page">
      <div>
        <div role="heading" aria-level={1} className="vr-page-title">
          Form controls demo
        </div>
        <div className="vr-body">
          Each widget below is styled entirely with <code>--vr-*</code> CSS
          custom properties. Inputs use <code>--vr-hsp-sm</code> /{' '}
          <code>--vr-vsp-sm</code> for padding, <code>--vr-radius</code> for
          corners, <code>--vr-color-muted</code> for borders,{' '}
          <code>--vr-color-accent</code> on focus,{' '}
          <code>--vr-color-muted</code> on disabled state. Toggle any token in
          the Design Token Panel to see every widget update live.
        </div>
      </div>

      <form
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vr-vsp-md)' }}
        onSubmit={(e) => e.preventDefault()}
      >
        {/* ── Text input ──────────────────────────────────────────────── */}
        <div>
          <div role="heading" aria-level={2} className="vr-subsection-title">
            Text input
          </div>
          <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
            <code>bg-surface</code> background · <code>border-muted</code> border ·{' '}
            <code>focus:border-accent</code> focus ring · <code>radius</code> corners
          </div>

          {/* Active (normal) */}
          <div className="vr-field">
            <label className="vr-label" htmlFor="input-text">
              Full name
            </label>
            <input
              id="input-text"
              type="text"
              placeholder="Jane Doe"
              className="vr-input"
            />
          </div>

          {/* Disabled */}
          <div className="vr-field" style={{ marginTop: 'var(--vr-vsp-sm)' }}>
            <label className="vr-label is-muted" htmlFor="input-text-disabled">
              Full name (disabled)
            </label>
            <input
              id="input-text-disabled"
              type="text"
              placeholder="Jane Doe"
              disabled
              className="vr-input"
            />
            <span className="vr-helper">
              Disabled state: <code>--vr-color-muted</code> background
            </span>
          </div>
        </div>

        {/* ── Email input ─────────────────────────────────────────────── */}
        <div>
          <div role="heading" aria-level={2} className="vr-subsection-title">
            Email input
          </div>
          <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
            Same token set as text input; browser provides email-specific keyboard on mobile.
          </div>
          <div className="vr-field">
            <label className="vr-label" htmlFor="input-email">
              Email address
            </label>
            <input
              id="input-email"
              type="email"
              placeholder="jane@example.com"
              className="vr-input"
            />
          </div>
        </div>

        {/* ── Select ──────────────────────────────────────────────────── */}
        <div>
          <div role="heading" aria-level={2} className="vr-subsection-title">
            Select
          </div>
          <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
            Native chevron retained; same token set as text input.
          </div>
          <div className="vr-field">
            <label className="vr-label" htmlFor="select-role">
              Role
            </label>
            <select id="select-role" className="vr-input">
              <option value="">Select a role…</option>
              <option value="designer">Designer</option>
              <option value="engineer">Engineer</option>
              <option value="pm">Product manager</option>
            </select>
          </div>
        </div>

        {/* ── Textarea ────────────────────────────────────────────────── */}
        <div>
          <div role="heading" aria-level={2} className="vr-subsection-title">
            Textarea
          </div>
          <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
            min-height 6rem — visual floor; below-token granularity, component-local.
          </div>
          <div className="vr-field">
            <label className="vr-label" htmlFor="textarea-bio">
              Bio
            </label>
            {/* reason: min-height is a visual default below token granularity */}
            <textarea
              id="textarea-bio"
              placeholder="Tell us about yourself…"
              className="vr-input"
              style={{ minHeight: '6rem', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* ── Submit button ───────────────────────────────────────────── */}
        <div>
          <div role="heading" aria-level={2} className="vr-subsection-title">
            Submit button
          </div>
          <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
            <code>--vr-color-primary</code> fill · <code>--vr-fg</code> label ·{' '}
            <code>--vr-color-accent</code> hover · <code>--vr-radius</code> corners
          </div>
          <div>
            <button type="submit" className="vr-button is-primary">
              Submit form
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
