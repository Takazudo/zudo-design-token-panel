import { describe, expect, it } from 'vitest';
import {
  buildStaticSuggestions,
  buildSuggestions,
  buildThemeSuggestions,
  filterSuggestions,
  STATIC_SUGGESTIONS,
} from '../suggestions';

describe('DOM Tweaker Tailwind suggestions', () => {
  it('builds a prototype-sized static list that is sorted and deduped', () => {
    const suggestions = buildStaticSuggestions();

    expect(suggestions).toHaveLength(1055);
    expect(suggestions).toEqual([...suggestions].sort());
    expect(new Set(suggestions).size).toBe(suggestions.length);
    expect(STATIC_SUGGESTIONS).toEqual(suggestions);

    expect(suggestions).toEqual(
      expect.arrayContaining([
        'bg-blue-500',
        'border-rose-950',
        'font-semibold',
        'gap-x-4',
        'grid',
        'px-0.5',
        'rounded-full',
        'shadow-lg',
        'text-sm',
        'w-full',
      ]),
    );
  });

  it('derives color and spacing utilities from Tailwind v4 @theme custom properties', () => {
    const suggestions = buildThemeSuggestions(`
      @theme /* tolerated */ inline {
        --color-accent-soft: oklch(70% 0.1 260);
        --spacing-hsp-md: 1rem;
        --spacing-page-gutter-sm: clamp(1rem, 2vw, 2rem);
        --font-display: "Inter";
        --breakpoint-shell: 72rem;
        --color-*: initial;
      }
    `);

    expect(suggestions).toEqual([...suggestions].sort());
    expect(new Set(suggestions).size).toBe(suggestions.length);

    expect(suggestions).toEqual(
      expect.arrayContaining([
        'bg-accent-soft',
        'border-accent-soft',
        'text-accent-soft',
        'p-hsp-md',
        'px-hsp-md',
        'py-hsp-md',
        'gap-hsp-md',
        'gap-x-hsp-md',
        'gap-y-hsp-md',
        'w-hsp-md',
        'space-x-hsp-md',
        'mx-page-gutter-sm',
      ]),
    );

    expect(suggestions).not.toEqual(expect.arrayContaining(['font-display']));
    expect(suggestions).not.toEqual(expect.arrayContaining(['breakpoint-shell']));
    expect(suggestions).not.toEqual(expect.arrayContaining(['bg-*']));
  });

  it('merges host theme candidates with the static list deterministically', () => {
    const suggestions = buildSuggestions(`
      @theme {
        --color-brand: #7c3aed;
        --spacing-hsp-md: 1rem;
      }
    `);

    expect(suggestions).toEqual([...suggestions].sort());
    expect(new Set(suggestions).size).toBe(suggestions.length);
    expect(count(suggestions, 'bg-brand')).toBe(1);
    expect(suggestions).toEqual(expect.arrayContaining(['bg-brand', 'px-hsp-md']));
  });

  it('filters by prefix, respects limit, and returns nothing for an empty query', () => {
    expect(filterSuggestions('', 10)).toEqual([]);
    expect(filterSuggestions('px-', 0)).toEqual([]);
    expect(filterSuggestions('px-', -1)).toEqual([]);
    expect(filterSuggestions('does-not-exist', 10)).toEqual([]);

    expect(filterSuggestions('px-', 5)).toEqual(['px-0', 'px-0.5', 'px-1', 'px-1.5', 'px-10']);

    const themed = buildSuggestions('@theme { --spacing-hsp-md: 1rem; }');
    expect(filterSuggestions('px-h', 10, themed)).toEqual(['px-hsp-md']);
  });
});

function count(values: readonly string[], target: string): number {
  return values.filter((value) => value === target).length;
}
