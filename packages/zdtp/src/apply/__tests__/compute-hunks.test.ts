import { describe, expect, it } from 'vitest';
import { computeHunks } from '../compute-hunks';

describe('computeHunks', () => {
  it('uses the equal-line-count path and returns proposed-file context', () => {
    const before = ':root {\n  --x-color: red;\n  --x-space: 1rem;\n}';
    const after = ':root {\n  --x-color: blue;\n  --x-space: 1rem;\n}';

    expect(computeHunks(before, after, ['--x-color'])).toEqual([
      {
        cssVar: '--x-color',
        line: 2,
        before: '  --x-color: red;',
        after: '  --x-color: blue;',
        context: { before: [':root {'], after: ['  --x-space: 1rem;'] },
      },
    ]);
  });

  it('uses LCS fallback when an earlier replacement adds a line', () => {
    const before = ':root {\n  --x-color: red;\n  --x-space: 1rem;\n}';
    const after =
      ':root {\n  --x-color: color-mix(\n    in oklch, red, blue);\n  --x-space: 2rem;\n}';

    const hunks = computeHunks(before, after, ['--x-color', '--x-space']);
    expect(hunks.map(({ cssVar, line }) => ({ cssVar, line }))).toEqual([
      { cssVar: '--x-color', line: 2 },
      { cssVar: '--x-space', line: 4 },
    ]);
    expect(hunks[1].context.before).toEqual(['    in oklch, red, blue);']);
  });

  it('returns one hunk per cssVar when declarations share a line', () => {
    const before = ':root { --x-a: 1px; --x-b: 2px; }';
    const after = ':root { --x-a: 3px; --x-b: 4px; }';

    const hunks = computeHunks(before, after, ['--x-a', '--x-b']);
    expect(hunks).toHaveLength(2);
    expect(hunks.map((hunk) => hunk.cssVar)).toEqual(['--x-a', '--x-b']);
    expect(hunks.map((hunk) => hunk.line)).toEqual([1, 1]);
  });

  it('ignores commented-out declarations when locating the live hunk', () => {
    const before = ':root {\n  /* --x-color: fake; */\n  --x-color: red;\n}';
    const after = ':root {\n  /* --x-color: fake; */\n  --x-color: blue;\n}';

    expect(computeHunks(before, after, ['--x-color'])[0]).toEqual(
      expect.objectContaining({
        line: 3,
        before: '  --x-color: red;',
        after: '  --x-color: blue;',
      }),
    );
  });
});
