import { AppShell } from '../components/app-shell';
import card from '../components/card.module.css';
import note from '../components/note.module.css';

export default function NotesPage() {
  return (
    <AppShell title="Notes — zdtp CSS Modules demo" activePath="/notes/">
      <article class={card.card} data-token-card>
        <p class={card.eyebrow}>NOTES</p>
        <h1 class={card.title}>Navigation keeps the panel instance honest.</h1>
        <p class={card.body}>
          Moving between Home and Notes mounts and disposes the panel with the page scope.
          Saved overrides stay in this demo’s own storage prefix. Apply writes{' '}
          <code>styles/tokens.css</code> only while the local sidecar is running.
        </p>
        <aside class={note.note}>
          <h2 class={note.title}>Production</h2>
          <p class={card.body}>
            The deployed site keeps browser editing, reset, and export. It does not offer a
            disk write, because the static host has no sidecar.
          </p>
        </aside>
      </article>
    </AppShell>
  );
}
