import type { TabConfig } from '../tokens/tier-model';
import { sanitizeHtml } from '../utils/sanitize-html';

interface NotesTabProps {
  tab: TabConfig;
}

/**
 * Notes tab — host-configurable "token notes" landing view (#515).
 *
 * Renders `tab.notesExtras.title` as a section heading
 * (`div[role="heading"][aria-level=3]`, NEVER an hN tag — see
 * packages/zdtp/CLAUDE.md "Panel DOM hygiene") and `tab.notesExtras.html` as
 * sanitized HTML via `dangerouslySetInnerHTML` — the package's first and only
 * use of it. `sanitizeHtml` (utils/sanitize-html.ts) is the security
 * boundary, an allowlist parser, not this component and not the CSS below.
 *
 * The rendered `.tokenpanel-notes-body` subtree is HOST-AUTHORED PROSE
 * CONTENT, not panel chrome: the DOM-hygiene ban on h1-h6/p/ul/a/table/etc.
 * applies to the panel's OWN JSX, and does not apply inside sanitized note
 * content — that's exactly the markup a "notes" feature needs to render.
 *
 * `assertValidPanelConfig` requires `notesExtras` (non-empty title + html)
 * on every tab with `id: 'notes'`, so this component can assume it's
 * present without a runtime fallback UI.
 */
export default function NotesTab({ tab }: NotesTabProps) {
  const notesExtras = tab.notesExtras;
  if (!notesExtras) return null;

  return (
    <div className="tokenpanel-tab-content tokenpanel-notes-tab">
      <div role="heading" aria-level={3} className="tokenpanel-notes-heading">
        {notesExtras.title}
      </div>
      <div
        className="tokenpanel-notes-body"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(notesExtras.html) }}
      />
    </div>
  );
}
