// Runs after Claude edits or writes a file: formats it and fixes safe lint
// issues with Biome. Lint errors that can't be fixed automatically are sent
// back to Claude (exit code 2) so it fixes them before moving on.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const biome = join(projectDir, 'node_modules', '@biomejs', 'biome', 'bin', 'biome');

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}

const file = input.tool_input?.file_path;
const handled = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css'];
if (!file || !handled.includes(extname(file)) || !existsSync(file)) process.exit(0);

const rel = relative(projectDir, file).replaceAll('\\', '/');
if (rel.startsWith('..') || /^(node_modules|android|build|public|dist|release)\//.test(rel)) process.exit(0);

// Biome not installed yet (e.g. fresh clone without npm install): skip quietly.
if (!existsSync(biome)) process.exit(0);

const result = spawnSync(
  process.execPath,
  [biome, 'check', '--write', '--no-errors-on-unmatched', '--colors=off', file],
  { cwd: projectDir, encoding: 'utf8' },
);

if (result.status !== 0) {
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  process.stderr.write(`Biome found problems in ${rel} that it could not fix automatically. Fix them:\n${output}\n`);
  process.exit(2);
}
