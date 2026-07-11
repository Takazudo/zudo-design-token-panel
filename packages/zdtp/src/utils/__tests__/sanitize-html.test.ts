// @vitest-environment jsdom

/**
 * Unit tests for the notes-tab allowlist HTML sanitizer (#515).
 *
 * Coverage required by the design (packages/zdtp/CLAUDE.md, sub-issue #515):
 * data: / namespaced URLs, srcdoc, SVG payloads, style attributes,
 * malformed/mismatched markup, and dangerous-subtree removal — plus a
 * positive check that legitimate prose markup survives untouched.
 */

import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../sanitize-html';

describe('sanitizeHtml — allowed prose markup passes through', () => {
  it('keeps headings, paragraphs, lists, links, tables, and inline emphasis', () => {
    const input =
      '<h2>Title</h2>' +
      '<p>Some <strong>bold</strong> and <em>italic</em> text with a <a href="https://example.com">link</a>.</p>' +
      '<ul><li>one</li><li>two</li></ul>' +
      '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>' +
      '<blockquote>quoted</blockquote>' +
      '<pre><code>const x = 1;</code></pre>' +
      '<hr>' +
      '<img src="https://example.com/a.png" alt="pic">';

    const out = sanitizeHtml(input);

    expect(out).toContain('<h2>Title</h2>');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<em>italic</em>');
    expect(out).toContain('<a href="https://example.com">link</a>');
    expect(out).toContain('<li>one</li>');
    expect(out).toContain('<table>');
    expect(out).toContain('<th>H</th>');
    expect(out).toContain('<td>D</td>');
    expect(out).toContain('<blockquote>quoted</blockquote>');
    expect(out).toContain('<code>const x = 1;</code>');
    expect(out).toContain('<hr>');
    expect(out).toContain('src="https://example.com/a.png"');
    expect(out).toContain('alt="pic"');
  });

  it('preserves a relative and a mailto href', () => {
    const out = sanitizeHtml(
      '<a href="/docs/page">rel</a><a href="mailto:a@b.com">mail</a><a href="#anchor">frag</a>',
    );
    expect(out).toContain('href="/docs/page"');
    expect(out).toContain('href="mailto:a@b.com"');
    expect(out).toContain('href="#anchor"');
  });
});

describe('sanitizeHtml — data: and namespaced URLs', () => {
  it('strips a data: href from an anchor but keeps the element and text', () => {
    const out = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">link</a>');
    expect(out).not.toContain('data:');
    expect(out).not.toMatch(/href=/);
    expect(out).toContain('link');
  });

  it('strips a data: src from an img', () => {
    const out = sanitizeHtml('<img src="data:image/png;base64,AAAA" alt="x">');
    expect(out).not.toContain('data:');
    expect(out).not.toMatch(/src=/);
  });

  it('strips a javascript: href, including a tab-obfuscated variant', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/href=/);
    expect(sanitizeHtml('<a href="java\tscript:alert(1)">x</a>')).not.toMatch(/href=/);
  });

  it('strips a javascript: href hidden behind a leading C0 control character', () => {
    // Browsers strip ANY leading C0 control (U+0000-U+001F), not just
    // tab/newline/CR, before resolving a URL's scheme — a leading backspace
    // (U+0008) here still resolves to the javascript: scheme in a real
    // browser even though it isn't whitespace a naive .trim() would catch.
    expect(sanitizeHtml('<a href="\x08javascript:alert(1)">x</a>')).not.toMatch(/href=/);
    expect(sanitizeHtml('<a href="\x01\x02javascript:alert(1)">x</a>')).not.toMatch(/href=/);
  });

  it('strips a custom/namespaced URL scheme', () => {
    expect(sanitizeHtml('<a href="custom-scheme:payload">x</a>')).not.toMatch(/href=/);
  });

  it('drops a namespaced attribute entirely (not in the attribute allowlist)', () => {
    const out = sanitizeHtml('<a xlink:href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('xlink');
    expect(out).not.toContain('javascript:');
  });
});

describe('sanitizeHtml — srcdoc / iframe removal', () => {
  it('removes an iframe (and its srcdoc payload) entirely', () => {
    const out = sanitizeHtml(
      '<p>before</p><iframe srcdoc="<script>alert(1)</script>"></iframe><p>after</p>',
    );
    expect(out).not.toContain('iframe');
    expect(out).not.toContain('srcdoc');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('before');
    expect(out).toContain('after');
  });
});

describe('sanitizeHtml — SVG / MathML payload removal', () => {
  it('removes an SVG subtree, including event handlers and nested script', () => {
    const out = sanitizeHtml(
      '<p>before</p><svg onload="alert(1)"><script>alert(2)</script><circle r="5"/></svg><p>after</p>',
    );
    expect(out).not.toContain('svg');
    expect(out).not.toContain('onload');
    expect(out).not.toContain('alert(1)');
    expect(out).not.toContain('alert(2)');
    expect(out).not.toContain('circle');
    expect(out).toContain('before');
    expect(out).toContain('after');
  });

  it('removes a MathML subtree', () => {
    const out = sanitizeHtml('<p>ok</p><math><mrow><mi>x</mi></mrow></math>');
    expect(out).not.toContain('math');
    expect(out).not.toContain('mrow');
    expect(out).toContain('ok');
  });
});

describe('sanitizeHtml — style attributes', () => {
  it('strips a style attribute from an allowed element but keeps its content', () => {
    const out = sanitizeHtml('<p style="background:url(javascript:alert(1))">text</p>');
    expect(out).not.toContain('style');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('<p>text</p>');
  });

  it('removes a <style> element entirely, including its CSS text', () => {
    const out = sanitizeHtml('<style>body{display:none}</style><p>visible</p>');
    expect(out).not.toContain('style');
    expect(out).not.toContain('display:none');
    expect(out).toContain('visible');
  });
});

describe('sanitizeHtml — malformed / mismatched markup', () => {
  it('does not throw on mismatched/overlapping tags and preserves the text', () => {
    expect(() => sanitizeHtml('<p><b>bold<i>both</p></b></i>')).not.toThrow();
    const out = sanitizeHtml('<p><b>bold<i>both</p></b></i>');
    expect(out).toContain('bold');
    expect(out).toContain('both');
  });

  it('keeps only the first of duplicate attributes and drops a disallowed one', () => {
    const out = sanitizeHtml('<div class="a" class="b" onclick="evil()">ok</div>');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('evil');
    expect(out).toMatch(/class="a"/);
    expect(out).toContain('ok');
  });

  it('does not throw on an empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('sanitizeHtml — dangerous-subtree removal', () => {
  it('removes <script>, its text content is never emitted', () => {
    const out = sanitizeHtml('<p>a</p><script>alert(1)</script><p>b</p>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('a');
    expect(out).toContain('b');
  });

  it('removes <object>, <embed>, and <form> entirely', () => {
    const out = sanitizeHtml(
      '<object data="evil.swf"></object><embed src="evil.swf"><form action="/evil"><input value="x"></form>',
    );
    expect(out).not.toContain('object');
    expect(out).not.toContain('embed');
    expect(out).not.toContain('form');
    expect(out).not.toContain('input');
    expect(out).not.toContain('evil.swf');
  });

  it('drops an unrecognised custom tag along with its inner content', () => {
    const out = sanitizeHtml('<p>keep</p><evil-widget>drop-me</evil-widget>');
    expect(out).not.toContain('evil-widget');
    expect(out).not.toContain('drop-me');
    expect(out).toContain('keep');
  });
});

describe('sanitizeHtml — text content is never re-interpreted as markup', () => {
  it('round-trips HTML-entity-encoded text as literal text, not tags', () => {
    const out = sanitizeHtml('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    expect(out).not.toMatch(/<script>/);
    expect(out).toContain('alert(1)');
  });
});
