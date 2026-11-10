import { AppShell } from '../components/app-shell';
import card from '../components/card.module.css';
import note from '../components/note.module.css';
import shell from '../components/shell.module.css';

const paletteGroups = [
  { id: 'base', label: 'Base', steps: ['0', '1', '2', '3', '4', '5', '6'] },
  { id: 'brand', label: 'Brand', steps: ['0', '1', '2', '3', '4'] },
  { id: 'accent', label: 'Accent', steps: ['0', '1', '2', '3'] },
  { id: 'state', label: 'State', steps: ['Success', 'Danger', 'Warning', 'Info'] },
];

export default function HomePage() {
  return (
    <AppShell title="zdtp CSS Modules demo" activePath="/">
      <section class={card.card} data-token-card>
        <p class={card.eyebrow}>CSS MODULES</p>
        <h1 class={card.title}>The same tokens, scoped to each component.</h1>
        <p class={card.body}>
          This card reads <code>--demo-surface</code>, <code>--demo-ink</code>,{' '}
          <code>--demo-space-card</code>, and <code>--demo-radius-card</code> from{' '}
          <code>card.module.css</code>. Wind is off. The Wind demo uses the same authored
          properties through zudo-wind utilities at{' '}
          <a href="https://zdtp-demo-zudowind.zudolab.dev/">zdtp-demo-zudowind.zudolab.dev</a>.
        </p>
        <aside class={note.note} data-note>
          <h2 class={note.title}>Scoped title</h2>
          <p class={card.body}>
            This note also defines a <code>.title</code> class. The build rewrites each
            module separately, so the two titles do not share a selector.
          </p>
        </aside>
      </section>

      <section class={card.card}>
        <p class={card.eyebrow}>PALETTE</p>
        <h2 class={card.title}>Four groups, one palette</h2>
        <p class={card.body}>
          Open the token panel and edit a ramp or the card spacing. Semantic roles use{' '}
          <code>light-dark()</code>, and the note beside the title keeps its own scoped class.
        </p>
        {paletteGroups.map((group) => (
          <div key={group.id}>
            <h3 class={note.title}>{group.label}</h3>
            <div class={shell.swatches}>
              {group.steps.map((label, index) => (
                <div class={shell.swatch} key={index}>
                  <span
                    class={shell.chip}
                    style={`--swatch-color: var(--demo-palette-${group.id}-${index})`}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
