// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildUniqueSelector,
  buildBreadcrumb,
  buildSummary,
  resolveRole,
  resolveText,
  resolveAttrs,
  buildElementPath,
  formatElementPath,
  buildElementPathString,
  cssEscapeIdent,
} from '../build-element-path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setBody(html: string): void {
  document.body.innerHTML = html;
}

function $(selector: string): Element {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`fixture missing: ${selector}`);
  return el;
}

beforeEach(() => {
  setBody('');
});

afterEach(() => {
  setBody('');
});

// ---------------------------------------------------------------------------
// buildUniqueSelector
// ---------------------------------------------------------------------------

describe('buildUniqueSelector', () => {
  it('uses a unique id when present', () => {
    setBody('<div id="hero"><span>x</span></div>');
    const sel = buildUniqueSelector($('#hero'));
    expect(sel).toBe('#hero');
  });

  it('produced selector always re-selects exactly the same element', () => {
    setBody(`
      <main>
        <ul>
          <li><a href="/a">A</a></li>
          <li><a href="/b">B</a></li>
          <li><a href="/c">C</a></li>
        </ul>
      </main>
    `);
    const targets = document.querySelectorAll('a');
    for (const target of Array.from(targets)) {
      const sel = buildUniqueSelector(target);
      const matched = document.querySelectorAll(sel);
      expect(matched.length).toBe(1);
      expect(matched[0]).toBe(target);
    }
  });

  it('disambiguates same-tag siblings with :nth-of-type', () => {
    setBody('<section><p>one</p><p>two</p><p>three</p></section>');
    const second = document.querySelectorAll('p')[1];
    const sel = buildUniqueSelector(second);
    expect(sel).toContain(':nth-of-type(2)');
    expect(document.querySelector(sel)).toBe(second);
  });

  it('returns "html" for the document root element', () => {
    expect(buildUniqueSelector(document.documentElement)).toBe('html');
  });

  it('anchors on an ancestor id to keep the chain short', () => {
    setBody(`
      <div id="card">
        <div><div><a href="/x">link</a></div></div>
      </div>
    `);
    const link = $('a');
    const sel = buildUniqueSelector(link);
    expect(sel.startsWith('#card')).toBe(true);
    expect(document.querySelector(sel)).toBe(link);
  });
});

// ---------------------------------------------------------------------------
// buildBreadcrumb
// ---------------------------------------------------------------------------

describe('buildBreadcrumb', () => {
  it('renders a readable tag/class chain without nth-* noise', () => {
    setBody('<nav class="nav"><a class="cta" href="/x">go</a></nav>');
    const crumb = buildBreadcrumb($('a'));
    expect(crumb).toBe('body > nav.nav > a.cta');
  });

  it('drops hash-y / css-module class names from the chain', () => {
    setBody('<div class="Button_root__a1b2c"><span>x</span></div>');
    const crumb = buildBreadcrumb($('span'));
    // The hashed class is dropped, leaving the bare tag.
    expect(crumb).toContain('div >');
    expect(crumb).not.toContain('Button_root');
  });
});

// ---------------------------------------------------------------------------
// summary / role / text / attrs
// ---------------------------------------------------------------------------

describe('buildSummary', () => {
  it('combines tag, id, and up to two classes', () => {
    setBody('<a id="signup" class="cta primary extra" href="/x">go</a>');
    expect(buildSummary($('a'))).toBe('a#signup.cta.primary');
  });
});

describe('resolveRole', () => {
  it('prefers an explicit role attribute', () => {
    setBody('<div role="tab">x</div>');
    expect(resolveRole($('div'))).toBe('tab');
  });

  it('maps <a href> to link but bare <a> to null', () => {
    setBody('<a href="/x">link</a><a>anchor</a>');
    const anchors = document.querySelectorAll('a');
    expect(resolveRole(anchors[0])).toBe('link');
    expect(resolveRole(anchors[1])).toBe(null);
  });

  it('maps input types to roles', () => {
    setBody('<input type="checkbox"><input type="text"><input type="range">');
    const inputs = document.querySelectorAll('input');
    expect(resolveRole(inputs[0])).toBe('checkbox');
    expect(resolveRole(inputs[1])).toBe('textbox');
    expect(resolveRole(inputs[2])).toBe('slider');
  });

  it('maps common landmark/heading tags', () => {
    setBody('<nav></nav><h2>x</h2><ul></ul>');
    expect(resolveRole($('nav'))).toBe('navigation');
    expect(resolveRole($('h2'))).toBe('heading');
    expect(resolveRole($('ul'))).toBe('list');
  });
});

describe('resolveText', () => {
  it('collapses whitespace and trims', () => {
    setBody('<p>  hello   world  </p>');
    expect(resolveText($('p'))).toBe('hello world');
  });

  it('returns null for empty text', () => {
    setBody('<div></div>');
    expect(resolveText($('div'))).toBe(null);
  });

  it('truncates long text with an ellipsis', () => {
    const long = 'x'.repeat(200);
    setBody(`<p>${long}</p>`);
    const text = resolveText($('p'))!;
    expect(text.length).toBeLessThanOrEqual(60);
    expect(text.endsWith('…')).toBe(true);
  });
});

describe('resolveAttrs', () => {
  it('collects identifying attributes in priority order', () => {
    setBody('<input id="email" name="email" type="email" placeholder="you@x.com">');
    const attrs = resolveAttrs($('input'));
    expect(attrs[0]).toBe('id="email"');
    expect(attrs).toContain('name="email"');
    expect(attrs).toContain('type="email"');
  });

  it('returns an empty array when no identifying attributes exist', () => {
    setBody('<div></div>');
    expect(resolveAttrs($('div'))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildElementPath + formatElementPath
// ---------------------------------------------------------------------------

describe('buildElementPath + formatElementPath', () => {
  it('produces a full annotated block', () => {
    setBody('<nav class="nav"><a id="cta" class="btn" href="/go">Go now</a></nav>');
    const result = buildElementPath($('#cta'));
    expect(result.summary).toBe('a#cta.btn');
    expect(result.selector).toBe('#cta');
    expect(result.breadcrumb).toBe('body > nav.nav > a.btn');
    expect(result.role).toBe('link');
    expect(result.text).toBe('Go now');
    expect(result.attrs).toContain('id="cta"');

    const block = formatElementPath(result);
    expect(block).toContain('element:  a#cta.btn');
    expect(block).toContain('selector: #cta');
    expect(block).toContain('path:     body > nav.nav > a.btn');
    expect(block).toContain('role:     link');
    expect(block).toContain('text:     "Go now"');
  });

  it('omits empty optional lines', () => {
    setBody('<div></div>');
    const block = buildElementPathString($('div'));
    expect(block).toContain('element:  div');
    expect(block).not.toContain('role:');
    expect(block).not.toContain('text:');
    expect(block).toContain('size:');
  });
});

// ---------------------------------------------------------------------------
// cssEscapeIdent
// ---------------------------------------------------------------------------

describe('cssEscapeIdent', () => {
  it('escapes characters that are invalid in CSS identifiers', () => {
    // The exact escaping differs between CSS.escape and the fallback, but the
    // result must always be a usable identifier (round-trips via querySelector).
    setBody('<div id="a.b:c"></div>');
    const escaped = cssEscapeIdent('a.b:c');
    expect(() => document.querySelector(`#${escaped}`)).not.toThrow();
    expect(document.querySelector(`#${escaped}`)).toBe(document.getElementById('a.b:c'));
  });
});
