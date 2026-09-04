import { AppShell } from '../components/app-shell';

const palette = Array.from({ length: 16 }, (_, index) => index);

export default function HomePage() {
  return (
    <AppShell title="zdtp workspace playground" activePath="/">
      <div class="zfb-stack">
        <section class="zfb-hero">
          <p class="zfb-eyebrow">REAL ZFB CONSUMER</p>
          <h1 class="zfb-page-title">Tune the unpublished panel against a living page.</h1>
          <p class="zfb-lede">
            Every component is styled with <code>--zfb-*</code> custom properties. Add
            <code>?manifest=zudo-doc</code> to load the vendored consumer configuration instead.
          </p>
        </section>

        <section class="zfb-grid">
          <article class="zfb-card">
            <p class="zfb-eyebrow">TYPOGRAPHY</p>
            <h2 class="zfb-section-title">Semantic font references</h2>
            <p>Font roles resolve through the raw scale while line height, weight, and family use their native controls.</p>
          </article>
          <article class="zfb-card">
            <p class="zfb-eyebrow">APPLY PIPELINE</p>
            <h2 class="zfb-section-title">Edit the real stylesheet</h2>
            <p>Run the playground dev command, tweak a token, and Apply to rewrite <code>styles/global.css</code>.</p>
          </article>
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
      </div>
    </AppShell>
  );
}
