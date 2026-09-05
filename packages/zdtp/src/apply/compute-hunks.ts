/** A single CSS custom-property change suitable for an apply preview. */
export interface ApplyHunk {
  cssVar: string;
  /** One-based line number of the declaration in the proposed file. */
  line: number;
  /** Complete declaration line before the rewrite. */
  before: string;
  /** Complete declaration line after the rewrite. */
  after: string;
  /** Neighbouring proposed-file lines, excluding the declaration itself. */
  context: {
    before: string[];
    after: string[];
  };
}

interface LinePair {
  beforeIndex: number | null;
  afterIndex: number | null;
}

const MAX_LCS_CELLS = 4_000_000;

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

function containsDeclaration(line: string, cssVar: string): boolean {
  return new RegExp(`(?:^|[;{])\\s*${escapeRegExp(cssVar)}\\s*:`).test(line);
}

function maskCommentsPreservingLines(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, ' '));
}

/**
 * Align source lines. Normal token edits do not add/remove lines, so avoid
 * allocating an LCS matrix for that overwhelmingly common case. The fallback
 * keeps declaration locations stable when a replacement contains a newline.
 */
function alignLines(before: string[], after: string[]): LinePair[] {
  if (before.length === after.length) {
    return before.map((_, index) => ({ beforeIndex: index, afterIndex: index }));
  }

  const rows = before.length + 1;
  const cols = after.length + 1;
  // The request body and target files are host-controlled. Avoid turning a
  // pathological many-line replacement into an unbounded quadratic
  // allocation; direct declaration lookup below remains correct without an
  // alignment map when this defensive ceiling is crossed.
  if (rows * cols > MAX_LCS_CELLS) return [];
  const lcs = Array.from({ length: rows }, () => new Uint32Array(cols));
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      lcs[i][j] =
        before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const pairs: LinePair[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      pairs.push({ beforeIndex: i++, afterIndex: j++ });
    } else if (j < after.length && (i === before.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      pairs.push({ beforeIndex: null, afterIndex: j++ });
    } else {
      pairs.push({ beforeIndex: i++, afterIndex: null });
    }
  }
  return pairs;
}

function findDeclarationLine(lines: string[], maskedLines: string[], cssVar: string): number {
  return maskedLines.findIndex(
    (line, index) => containsDeclaration(line, cssVar) && lines[index] !== undefined,
  );
}

/**
 * Compute one preview hunk per changed cssVar.
 *
 * `changedCssVars` is authoritative: unrelated textual differences never
 * become hunks. Input order is retained so the response follows request/apply
 * order, including when multiple declarations share one physical line.
 */
export function computeHunks(
  beforeSource: string,
  afterSource: string,
  changedCssVars: readonly string[],
  contextLineCount = 1,
): ApplyHunk[] {
  const beforeLines = beforeSource.split('\n');
  const afterLines = afterSource.split('\n');
  const maskedBeforeLines = maskCommentsPreservingLines(beforeSource).split('\n');
  const maskedAfterLines = maskCommentsPreservingLines(afterSource).split('\n');
  const alignment = alignLines(beforeLines, afterLines);
  const contextSize = Math.max(0, Math.floor(contextLineCount));

  return changedCssVars.flatMap((cssVar): ApplyHunk[] => {
    const beforeIndex = findDeclarationLine(beforeLines, maskedBeforeLines, cssVar);
    const afterIndex = findDeclarationLine(afterLines, maskedAfterLines, cssVar);
    if (beforeIndex === -1 || afterIndex === -1) return [];

    // Consult the alignment in the fallback case. A changed declaration is
    // normally an unmatched pair, but surrounding LCS matches establish the
    // proposed-file line number even after earlier inserted/deleted lines.
    const alignedAfterIndex = alignment.find(
      (pair) => pair.beforeIndex === beforeIndex && pair.afterIndex !== null,
    )?.afterIndex;
    const lineIndex = alignedAfterIndex ?? afterIndex;

    return [
      {
        cssVar,
        line: lineIndex + 1,
        before: beforeLines[beforeIndex],
        after: afterLines[afterIndex],
        context: {
          before: afterLines.slice(Math.max(0, lineIndex - contextSize), lineIndex),
          after: afterLines.slice(lineIndex + 1, lineIndex + 1 + contextSize),
        },
      },
    ];
  });
}
