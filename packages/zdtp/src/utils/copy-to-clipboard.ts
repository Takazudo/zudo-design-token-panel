/**
 * copyToClipboard — robust copy with a legacy fallback.
 *
 * Primary path: `navigator.clipboard.writeText` (modern, async, requires a
 * secure context + document focus). Fallback: an offscreen `<textarea>` +
 * `document.execCommand('copy')` for browsers / contexts that reject the
 * modern API (insecure context, denied permission, focus-trapped dialogs, …).
 *
 * Returns `true` when either path succeeds, `false` when both fail. Never
 * throws — callers can surface a "Copied" / "Failed" state from the boolean.
 *
 * `container` lets the caller append the fallback textarea inside a specific
 * element (e.g. an open `<dialog>`) so a focus trap does not block `select()`.
 * Defaults to `document.body`.
 */
export async function copyToClipboard(
  text: string,
  container?: HTMLElement | null,
): Promise<boolean> {
  // Primary: modern async Clipboard API.
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  // Fallback: offscreen textarea + execCommand.
  if (typeof document === 'undefined') return false;
  const host = container ?? document.body;
  if (!host) return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;opacity:0;left:-9999px;top:0';
    textarea.tabIndex = -1;
    textarea.setAttribute('aria-hidden', 'true');
    host.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    host.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
