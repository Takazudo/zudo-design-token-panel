import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const isFile = (filename) => {
  try { return statSync(filename).isFile(); } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
};

function resolveSpecifier(specifier, filename, root) {
  const target = path.resolve(path.dirname(filename), specifier);
  // Declarations describe source modules even when Vite bundles their runtime JS.
  const candidates = /\.js$/.test(specifier)
    ? [[target.replace(/\.js$/, '.d.ts'), specifier], [target, specifier]]
    : /\.(mjs|cjs)$/.test(specifier)
      ? [[target.replace(/\.(mjs|cjs)$/, (_, ext) => ext === 'mjs' ? '.d.mts' : '.d.cts'), specifier], [target, specifier]]
      : [[`${target}.d.ts`, `${specifier}.js`], [path.join(target, 'index.d.ts'), `${specifier.replace(/\/$/, '')}/index.js`]];
  for (const [candidate, result] of candidates) {
    const relative = path.relative(root, candidate);
    if (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) && isFile(candidate)) return result;
  }
  throw new Error(`${filename}: unresolved relative declaration specifier ${JSON.stringify(specifier)}`);
}

export function normalizeDeclarations(directory) {
  const root = path.resolve(directory);
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const filename = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(filename);
      else if (entry.isFile() && /\.d\.(ts|mts|cts)$/.test(entry.name)) files.push(filename);
    }
  }
  walk(root);
  // Validate the entire tree before writing, so a missing target cannot leave a partial transform.
  const outputs = files.map((filename) => {
    const source = readFileSync(filename, 'utf8');
    const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
    if (ast.parseDiagnostics.length) throw new Error(`${filename}: invalid declaration syntax`);
    const edits = [];
    function replace(literal) {
      const specifier = literal.text;
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) return;
      const resolved = resolveSpecifier(specifier, filename, root);
      if (resolved !== specifier) edits.push([literal.getStart(ast), literal.end, JSON.stringify(resolved)]);
    }
    function visit(node) {
      if (ts.isImportDeclaration(node) && !node.importClause && ts.isStringLiteral(node.moduleSpecifier) && /^(?:\.\.?\/).*\.css$/.test(node.moduleSpecifier.text)) {
        edits.push([node.getStart(ast), node.end, '']);
        return;
      }
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) replace(node.moduleSpecifier);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) replace(node.argument.literal);
      if (ts.isExternalModuleReference(node) && node.expression && ts.isStringLiteral(node.expression)) replace(node.expression);
      ts.forEachChild(node, visit);
    }
    visit(ast);
    let output = source;
    for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0])) output = output.slice(0, start) + replacement + output.slice(end);
    return [filename, output];
  });
  for (const [filename, output] of outputs) writeFileSync(filename, output);
  return files.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ?? fileURLToPath(new URL('../dist/', import.meta.url));
  console.log(`Normalized ${normalizeDeclarations(directory)} declaration files.`);
}
