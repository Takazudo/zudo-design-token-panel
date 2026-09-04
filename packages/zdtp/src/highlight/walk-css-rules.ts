/** Walk style rules recursively through grouping rules and CSS nesting. */
export function walkCssRules(
  rules: CSSRuleList | Iterable<CSSRule>,
  visit: (rule: CSSStyleRule) => void,
): void {
  for (const rule of rules) {
    if ('selectorText' in rule && 'style' in rule) {
      const styleRule = rule as CSSStyleRule;
      visit(styleRule);

      const nested = (styleRule as unknown as { cssRules?: CSSRuleList }).cssRules;
      if (nested?.length) walkCssRules(nested, visit);
      continue;
    }

    const nested = (rule as unknown as { cssRules?: CSSRuleList }).cssRules;
    if (nested?.length) walkCssRules(nested, visit);
  }
}
