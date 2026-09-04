---
title: Token-bound prose
lang: en
---

# Token-bound prose

This page makes the spacing and typography controls visible in ordinary editorial content. Every rule reads a `--zfb-*` custom property.

## A practical rhythm

Good token systems make long pages feel deliberate without asking authors to think about pixels. The same spacing scale separates sections, paragraphs, lists, and code.

- Semantic font sizes reference a raw scale.
- Unitless line heights remain useful across sizes.
- Radius and transition duration stay editable as lengths.

> A playground is most valuable when it behaves like a small real product, not a component fixture.

```css
.example {
  padding: var(--zfb-vsp-md) var(--zfb-hsp-lg);
  transition: color var(--zfb-transition-normal) var(--zfb-easing-standard);
}
```

Return to the [component gallery](/).
