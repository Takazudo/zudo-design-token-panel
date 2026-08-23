/**
 * Allowlist HTML sanitizer for host-supplied "token notes" content (#515).
 *
 * Security boundary: a strict ALLOWLIST of tags and attributes, not a
 * blacklist — anything not explicitly permitted is stripped, including
 * tags/attributes a blacklist would never have anticipated (custom elements,
 * future HTML, namespaced foreign-content attributes). This is the package's
 * only HTML sanitizer (see `controls/sanitize-css-value.ts` for the separate
 * CSS-value sanitizer used elsewhere) and it is the thing standing between a
 * host's `notesExtras.html` string and `dangerouslySetInnerHTML` in
 * `tabs/notes-tab.tsx`.
 *
 * Implementation: parse with the browser's own `DOMParser` (dependency-free —
 * no external sanitizer library), then rebuild a FRESH tree by walking the
 * parsed result and copying across only allowlisted tags/attributes. Using
 * the real HTML parser means malformed markup (mismatched tags, unclosed
 * elements, HTML entities) is resolved into a well-formed DOM tree by the
 * browser itself before the allowlist walk ever runs — the walk only ever
 * sees valid nodes, never raw markup text it would have to re-parse or guess
 * at (the classic weakness of a regex/string-replace "sanitizer").
 */

/** Tags the notes body may render. Everything else — including its entire
 * subtree — is removed (see `sanitizeNode`). */
const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'div',
  'span',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'li',
  'a',
  'strong',
  'em',
  'b',
  'i',
  'code',
  'pre',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
  'hr',
  'blockquote',
]);

/** Attributes the notes body may carry, on any allowed tag.
 *
 * `class` is intentionally allowed so a host can style its own prose. Note the
 * accepted trade-off: `notesExtras.html` is host-supplied panel CONFIG (not
 * arbitrary end-user input), so it is semi-trusted — a host that wanted to
 * spoof the panel chrome by injecting `tokenpanel-*` classes could already do
 * far worse in its own config. `id`/`name` are deliberately NOT allowed (DOM
 * clobbering). Likewise `href`/`src` permit any allowlisted-scheme URL
 * (http/https/mailto): an `<img src="http://...">` in a note beacons the
 * viewer's IP on render — accepted for host-authored notes; no `target`/`rel`
 * is allowed so `<a>` cannot reverse-tabnab. */
const ALLOWED_ATTRS: ReadonlySet<string> = new Set(['href', 'src', 'alt', 'title', 'class']);

/** Void elements per the allowlist — never carry children. */
const VOID_TAGS: ReadonlySet<string> = new Set(['br', 'img', 'hr']);

/** URL schemes permitted in `href` / `src`. Anything else — `javascript:`,
 * `data:`, `vbscript:`, a namespaced/custom scheme — is rejected. */
const ALLOWED_URL_SCHEMES: ReadonlySet<string> = new Set(['http', 'https', 'mailto']);

/**
 * Is `raw` a safe `href`/`src` value?
 *
 * Scheme-relative, fragment (`#...`), and path-relative references (no
 * scheme at all) are always safe. Anything WITH a scheme must match the
 * allowlist above.
 *
 * The WHATWG URL "basic URL parser" strips (1) any LEADING or TRAILING C0
 * control (U+0000-U+001F) or space, and (2) ASCII tab/newline/CR from
 * ANYWHERE in the string, before resolving a scheme — so a real browser
 * parses both `"java\tscript:alert(1)"` (mid-string tab) AND
 * `"\x08javascript:alert(1)"` (a leading backspace, not tab/newline/CR) as
 * `javascript:`. A naive `.trim()` only strips JS whitespace (tab/LF/CR/
 * space/FF/VT/Unicode-space) — it leaves U+0008 and most other C0 controls
 * in place, so a leading backspace would defeat a trim-then-match check:
 * this function would see "no scheme" and wave the URL through as a safe
 * relative reference while the browser resolves the dangerous scheme behind
 * it. Fix: strip EVERY C0 control character from anywhere in the string
 * (broader than the spec's edge-only rule for non-tab/newline controls, but
 * that's the safe direction for a security boundary to err in — worst case
 * an unusual-but-harmless URL gets rejected, never the reverse) before
 * checking for a scheme.
 */
function isSafeUrl(raw: string): boolean {
  const value = Array.from(raw)
    .filter((char) => char.charCodeAt(0) > 0x1f)
    .join('')
    .trim();
  if (value.length === 0) return false;
  if (value.startsWith('#') || value.startsWith('/') || value.startsWith('.')) return true;
  const schemeMatch = value.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) return true; // no scheme — a bare relative reference.
  return ALLOWED_URL_SCHEMES.has(schemeMatch[1].toLowerCase());
}

function sanitizeAttributes(source: Element, target: Element): void {
  for (const attr of Array.from(source.attributes)) {
    const name = attr.name.toLowerCase();
    if (!ALLOWED_ATTRS.has(name)) continue; // drops style, on*, and any namespaced attribute.
    if ((name === 'href' || name === 'src') && !isSafeUrl(attr.value)) continue;
    target.setAttribute(name, attr.value);
  }
}

/**
 * Sanitize one DOM node (and, for allowed elements, its children) into a
 * freshly-created node in `doc`, or `null` to drop it.
 *
 * A disallowed element (anything not in `ALLOWED_TAGS` — `script`, `style`,
 * `iframe`, `object`, `embed`, `form`, any `svg`/`math` root, or a custom
 * tag) drops its ENTIRE subtree: this function returns `null` before
 * recursing into the element's children at all, rather than "unwrapping"
 * the tag and keeping its inner content. That is a deliberate strict-allowlist
 * choice — anything nested inside an unrecognised element is treated as
 * untrusted along with it.
 */
function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent ?? '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null; // comments, processing instructions, CDATA — drop.
  }
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) return null;

  const clone = doc.createElement(tag);
  sanitizeAttributes(el, clone);
  if (!VOID_TAGS.has(tag)) {
    for (const child of Array.from(el.childNodes)) {
      const sanitizedChild = sanitizeNode(child, doc);
      if (sanitizedChild) clone.appendChild(sanitizedChild);
    }
  }
  return clone;
}

/**
 * Sanitize host-supplied HTML (`TabConfig.notesExtras.html`) against the
 * strict allowlist above. Returns an HTML string safe to pass to
 * `dangerouslySetInnerHTML`.
 */
export function sanitizeHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const container = parsed.createElement('div');
  for (const child of Array.from(parsed.body.childNodes)) {
    const sanitizedChild = sanitizeNode(child, parsed);
    if (sanitizedChild) container.appendChild(sanitizedChild);
  }
  return container.innerHTML;
}
