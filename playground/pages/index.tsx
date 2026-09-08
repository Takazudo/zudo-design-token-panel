import { AppShell } from '../components/app-shell';

const paletteGroups = [
  { id: 'base', label: 'Base', steps: ['0', '1', '2', '3', '4', '5', '6'] },
  { id: 'brand', label: 'Brand', steps: ['0', '1', '2', '3', '4'] },
  { id: 'accent', label: 'Accent', steps: ['0', '1', '2', '3'] },
  { id: 'state', label: 'State', steps: ['0 · Success', '1 · Danger', '2 · Warning', '3 · Info'] },
];

export default function HomePage() {
  return (
    <AppShell title="zdtp full playground" activePath="/">
      <div class="zfb-stack">
        <section class="zfb-hero">
          <p class="zfb-eyebrow">FULL FIRST-PARTY DEMO</p>
          <h1 class="zfb-page-title">Explore the current in-repo build of zdtp.</h1>
          <p class="zfb-lede">
            This playground exercises the full panel against a living zfb site. For the smallest
            practical setup, visit the deliberately{' '}
            <a href="https://zdtp-minimal.zudolab.dev/">minimal zdtp demo</a>.
          </p>
        </section>

        <section class="zfb-card">
          <p class="zfb-eyebrow">TRY THE PANEL</p>
          <h2 class="zfb-section-title">Change a token and watch the page respond</h2>
          <p>
            Press <strong>Open token panel</strong>, then experiment with the Color and
            Palette tabs or adjust the typography roles. Every component here uses the{' '}
            <code>--zfb-*</code> tokens that the panel controls. The English and Japanese prose
            pages are useful for seeing those choices across longer content.
          </p>
        </section>

        <section class="zfb-card">
          <p class="zfb-eyebrow">STATIC TOKEN REFERENCE</p>
          <h2 class="zfb-section-title">Read the defaults on a plain page</h2>
          <p>
            The <a href="/dashboard/">token dashboard</a> lists the same manifest as a
            static Preact page, with light and dark inventories and a compact embedded example.
            It shows declared defaults and references, independently of saved panel edits.
          </p>
        </section>

        <section class="zfb-grid">
          <article class="zfb-card">
            <p class="zfb-eyebrow">DEFAULT MANIFEST</p>
            <h2 class="zfb-section-title">A compact tour of every control</h2>
            <p>
              The playground manifest is designed for exploration. It exposes the main control
              kinds and connects them directly to the tokens used by this page.
            </p>
          </article>
          <article class="zfb-card">
            <p class="zfb-eyebrow">ZUDO-DOC MANIFEST</p>
            <h2 class="zfb-section-title">A real consumer configuration</h2>
            <p>
              Open <a href="/?manifest=zudo-doc"><code>?manifest=zudo-doc</code></a> to run the real,
              vendored zudo-doc <code>PanelConfig</code>. Use it to inspect a production-scale token
              model instead of the playground tour.
            </p>
          </article>
        </section>

        <section class="zfb-card">
          <p class="zfb-eyebrow">APPLY IS LOCAL DEV ONLY</p>
          <h2 class="zfb-section-title">Why Apply is disabled here</h2>
          <p>
            Apply writes token changes to source files through a local development sidecar. A
            static host has no sidecar or writable source tree, so this deployed demo disables the
            action. Clone the repository and run <code>pnpm play</code> to try the complete write-to-disk
            workflow. The{' '}
            <a href="https://zdtp.zudolab.dev/docs/recipes/apply-pipeline-setup/">
              Apply pipeline setup guide
            </a>{' '}
            explains how it works.
          </p>
        </section>

        <section class="zfb-card">
          <p class="zfb-eyebrow">PALETTE → SEMANTIC ROLES → COMPONENTS</p>
          <h2 class="zfb-section-title">Four groups, one palette</h2>
          <p>
            Each row is a group; each column is a stable, zero-based step. The raw palette stays
            identical in light and dark mode. Components use semantic roles from the Color tab:
            backgrounds, text and primary colors pick a different ramp step for each mode through{' '}
            <code>light-dark()</code>. State colors are decorative, with labels outside the chips.
          </p>
          <p>
            Try editing a ramp in the Palette tab, then switch the page theme to see its semantic
            roles respond. In the Color tab, per-mode <code>var()</code> defaults currently open the
            picker at black. Opening changes nothing; editing replaces that mode with a concrete
            color and detaches it from the ramp. Reset restores the configured defaults.{' '}
            <a href="https://github.com/Takazudo/zudo-design-token-panel/issues/878">
              Reference-aware picker tracking
            </a>.
          </p>
          <div class="zfb-palette">
            {paletteGroups.map((group) => (
              <div class="zfb-palette__row" key={group.id}>
                <h3 class="zfb-palette__label">{group.label}</h3>
                <div class="zfb-swatches">
                  {group.steps.map((label, index) => (
                    <div class="zfb-swatch" key={index}>
                      <span
                        class="zfb-swatch__chip"
                        style={`--swatch-color: var(--zfb-palette-${group.id}-${index})`}
                        aria-hidden="true"
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section class="zfb-card">
          <p class="zfb-eyebrow">KEEP EXPLORING</p>
          <h2 class="zfb-section-title">Documentation and source</h2>
          <p>
            Read the <a href="https://zdtp.zudolab.dev/">zdtp documentation</a>{' '}
            for installation and API guidance, or browse the{' '}
            <a href="https://github.com/Takazudo/zudo-design-token-panel">GitHub repository</a> behind
            this demo.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
