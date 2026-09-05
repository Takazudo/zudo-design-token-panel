import { AppShell } from '../components/app-shell';

const palette = Array.from({ length: 16 }, (_, index) => index);

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
            <a href="https://zdtp-minimal.takazudomodular.com/">minimal zdtp demo</a>.
          </p>
        </section>

        <section class="zfb-card">
          <p class="zfb-eyebrow">TRY THE PANEL</p>
          <h2 class="zfb-section-title">Change a token and watch the page respond</h2>
          <p>
            Press <strong>Open token panel</strong>, then experiment with the color cluster and
            palette or adjust the typography roles. Every component here uses the{' '}
            <code>--zfb-*</code> tokens that the panel controls. The English and Japanese prose
            pages are useful for seeing those choices across longer content.
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
            <a href="https://zudo-design-token-panel.takazudomodular.com/docs/recipes/apply-pipeline-setup/">
              Apply pipeline setup guide
            </a>{' '}
            explains how it works.
          </p>
        </section>

        <section class="zfb-card">
          <h2 class="zfb-section-title">Color cluster</h2>
          <div class="zfb-swatches">
            {palette.map((index) => (
              <div class="zfb-swatch" style={`--swatch-color: var(--zfb-palette-${index})`}>
                {index}
              </div>
            ))}
          </div>
        </section>

        <section class="zfb-card">
          <p class="zfb-eyebrow">KEEP EXPLORING</p>
          <h2 class="zfb-section-title">Documentation and source</h2>
          <p>
            Read the <a href="https://zudo-design-token-panel.takazudomodular.com/">zdtp documentation</a>{' '}
            for installation and API guidance, or browse the{' '}
            <a href="https://github.com/Takazudo/zudo-design-token-panel">GitHub repository</a> behind
            this demo.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
