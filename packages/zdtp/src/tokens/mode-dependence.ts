import type { SemanticValue, TierItem } from './tier-model';

interface ModeSides {
  light: string;
  dark: string;
}

/**
 * Split a complete `light-dark(light, dark)` declaration into its two
 * top-level arguments.
 *
 * The scanner deliberately understands nested parentheses so values such as
 * `light-dark(rgb(0, 0, 0), #fff)` remain a single pair. It only recognizes a
 * single outer call: a second top-level value, an extra argument, an
 * unbalanced parenthesis, or a nested `light-dark()` call is rejected.
 */
export function splitLightDark(value: string): ModeSides | null {
  if (typeof value !== 'string') return null;
  const source = value.trim();
  const opening = /^light-dark\s*\(/i.exec(source);
  if (!opening) return null;

  const openIndex = opening[0].lastIndexOf('(');
  let depth = 1;
  let commaIndex = -1;
  let closeIndex = -1;

  for (let index = openIndex + 1; index < source.length; index++) {
    const char = source[index];

    // Parentheses and commas inside CSS strings are part of the argument,
    // rather than structural delimiters. Reject an unterminated string so a
    // malformed value cannot be mistaken for a valid pair.
    if (char === '"' || char === "'") {
      const quote = char;
      let closed = false;
      for (index++; index < source.length; index++) {
        if (source[index] === '\\') {
          index++;
        } else if (source[index] === quote) {
          closed = true;
          break;
        }
      }
      if (!closed) return null;
      continue;
    }

    // Ignore comments while looking for structural delimiters. This also
    // prevents comment text that happens to contain a parenthesis or comma
    // from changing the parse result.
    if (char === '/' && source[index + 1] === '*') {
      const commentEnd = source.indexOf('*/', index + 2);
      if (commentEnd === -1) return null;
      index = commentEnd + 1;
      continue;
    }

    if (char === '(') {
      // A mode pair cannot recursively contain another mode pair: there is no
      // unambiguous single light/dark side to expose in that case.
      if (/\blight-dark\s*$/i.test(source.slice(openIndex + 1, index))) return null;
      depth++;
    } else if (char === ')') {
      depth--;
      if (depth < 0) return null;
      if (depth === 0) {
        closeIndex = index;
        break;
      }
    } else if (char === ',' && depth === 1) {
      if (commaIndex !== -1) return null;
      commaIndex = index;
    }
  }

  if (closeIndex === -1 || source.slice(closeIndex + 1).trim() !== '') return null;
  if (commaIndex === -1) return null;

  const light = source.slice(openIndex + 1, commaIndex).trim();
  const dark = source.slice(commaIndex + 1, closeIndex).trim();
  if (light.length === 0 || dark.length === 0) return null;

  return { light, dark };
}

/**
 * Resolve the direct mode pair for one item. References are propagated by
 * consumers that have the surrounding token graph; this helper covers the
 * item, semantic-literal, and parsed-default precedence rules.
 */
export function resolveModeSides(
  item: TierItem,
  semanticOverride?: SemanticValue,
): ModeSides | null {
  if (item.modes !== undefined) return { ...item.modes };

  if (
    semanticOverride !== null &&
    typeof semanticOverride === 'object' &&
    !Array.isArray(semanticOverride) &&
    'literal' in semanticOverride
  ) {
    const literal = semanticOverride.literal;
    if (typeof literal === 'string') {
      // A string literal override is itself the effective source for rule 3.
      return splitLightDark(literal);
    }
    return { light: literal.light, dark: literal.dark };
  }

  return splitLightDark(item.default);
}

export function isModeDependent(
  item: TierItem,
  semanticOverride?: SemanticValue,
): boolean {
  return resolveModeSides(item, semanticOverride) !== null;
}
