/**
 * Pure-function argv parser for the `design-token-panel-server` bin.
 *
 * No external dependencies — only standard JS/TS — so this module is trivially
 * unit-testable and can be imported safely from non-Node contexts (although in
 * practice the bin file is the only consumer).
 *
 * Surface (matches the parse-args contract):
 *
 *   --root <dir>             repo root; default: process.cwd() (parser leaves null)
 *   --write-root <path>      REQUIRED; absolute or relative-to-root
 *   --routing <path>         REQUIRED; routing JSON file path
 *   --port <number>          default 24681
 *   --host <addr>            default 127.0.0.1
 *   --allow-origin <origin>  repeatable; required at least once for browser POST
 *   --quiet                  suppress per-request logs
 *   --help                   print usage and exit 0
 *
 * On invalid input, throws a descriptive `Error`. The bin entry catches it,
 * writes the message to stderr, and exits 1.
 */

const DEFAULT_PORT = 24681;
const DEFAULT_HOST = '127.0.0.1';

export interface ParsedArgs {
  root: string | null;
  writeRoot: string | null;
  routing: string | null;
  port: number;
  host: string;
  allowOrigins: string[];
  quiet: boolean;
  help: boolean;
}

export const HELP_TEXT = `Usage: design-token-panel-server [options]

Run a small Node http server that wraps the design-token apply handler.

Options:
  --root <dir>              Repo root used as the CWD reference for routing
                            paths. Defaults to the current working directory.
  --write-root <path>       REQUIRED. Absolute or root-relative path to the
                            single directory the bin is allowed to write into.
  --routing <path>          REQUIRED. Path to the routing JSON file
                            (prefix -> repo-relative CSS file path).
  --port <number>           TCP port to bind. Default: ${DEFAULT_PORT}.
  --host <addr>             Host/interface to bind. Default: ${DEFAULT_HOST}.
                            Use 0.0.0.0 to expose on the LAN (off by default).
  --allow-origin <origin>   Origin allowed to POST to /apply. Repeatable.
                            At least one is required for any browser to apply.
  --quiet                   Suppress per-request logs.
  --help                    Print this message and exit.

Examples:
  design-token-panel-server \\
    --write-root tokens \\
    --routing ./my.routing.json \\
    --allow-origin http://localhost:34434
`;

/**
 * Parse a raw argv array (typically `process.argv.slice(2)`) into a
 * `ParsedArgs` record. Throws on malformed input — the bin handles the throw.
 */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const result: ParsedArgs = {
    root: null,
    writeRoot: null,
    routing: null,
    port: DEFAULT_PORT,
    host: DEFAULT_HOST,
    allowOrigins: [],
    quiet: false,
    help: false,
  };

  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    switch (token) {
      case '--help':
      case '-h':
        result.help = true;
        i += 1;
        break;
      case '--quiet':
        result.quiet = true;
        i += 1;
        break;
      case '--root':
        result.root = takeValue(argv, i, '--root');
        i += 2;
        break;
      case '--write-root':
        result.writeRoot = takeValue(argv, i, '--write-root');
        i += 2;
        break;
      case '--routing':
        result.routing = takeValue(argv, i, '--routing');
        i += 2;
        break;
      case '--host':
        result.host = takeValue(argv, i, '--host');
        i += 2;
        break;
      case '--port': {
        const raw = takeValue(argv, i, '--port');
        const n = Number(raw);
        // 0 is a sentinel meaning "let the OS pick a free port" — the
        // integration tests rely on this; consumers can read the actual port
        // from the bin's startup log line.
        if (!Number.isInteger(n) || n < 0 || n > 65535) {
          throw new Error(`--port must be an integer in 0..65535 (got ${JSON.stringify(raw)})`);
        }
        result.port = n;
        i += 2;
        break;
      }
      case '--allow-origin': {
        const value = takeValue(argv, i, '--allow-origin');
        result.allowOrigins.push(value);
        i += 2;
        break;
      }
      default:
        throw new Error(`Unknown option: ${token}`);
    }
  }

  // --help short-circuits validation so `--help` works on a bare invocation.
  if (result.help) return result;

  if (!result.writeRoot) {
    throw new Error('--write-root is required (the only directory the bin will write into)');
  }
  if (!result.routing) {
    throw new Error('--routing is required (path to the routing JSON file)');
  }

  return result;
}

function takeValue(argv: readonly string[], i: number, flag: string): string {
  const v = argv[i + 1];
  if (typeof v !== 'string' || v.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return v;
}
