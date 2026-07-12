import domTweakerCss from './dom-tweaker.css?inline';

export const DOM_TWEAKER_STYLE_ID = 'tokenpanel-domtweaker-style';

export function ensureDomTweakerStyles(doc: Document = document): HTMLStyleElement {
  const existing = doc.getElementById(DOM_TWEAKER_STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;

  const style = doc.createElement('style');
  style.id = DOM_TWEAKER_STYLE_ID;
  style.setAttribute('data-tokenpanel-domtweaker-style', '');
  style.textContent = domTweakerCss;
  doc.head.append(style);
  return style;
}
