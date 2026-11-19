// Keeps source files small enough to read and change cheaply.
// New files may not exceed `maxLines`. Files that were already larger when the
// check was introduced are listed in `baseline` and may not grow; when one
// shrinks, its baseline is lowered with `--update`.
//
// Usage: node scripts/check-file-size.mjs [--update]
// Config: file-size.config.json in the project root.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const configPath = join(root, 'file-size.config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const { maxLines, include, extensions, ignore = [] } = config;
const baseline = config.baseline ?? {};
const update = process.argv.includes('--update');

const toPosix = (p) => p.split('\\').join('/');
const isIgnored = (rel) => ignore.some((prefix) => rel.startsWith(prefix));

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = toPosix(relative(root, full));
    if (entry === 'node_modules' || entry.startsWith('.') || isIgnored(rel)) continue;
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (extensions.includes(extname(entry))) yield rel;
  }
}

const sizes = {};
for (const dir of include) {
  try {
    for (const rel of walk(join(root, dir))) {
      const text = readFileSync(join(root, rel), 'utf8');
      const lines = text.split('\n').length;
      sizes[rel] = text.endsWith('\n') ? lines - 1 : lines;
    }
  } catch {
    // A listed folder that doesn't exist (yet) is fine.
  }
}

const problems = [];
const shrunk = [];
for (const [file, lines] of Object.entries(sizes)) {
  const allowed = baseline[file];
  if (allowed === undefined) {
    if (lines > maxLines) {
      problems.push(`${file}: ${lines} lines (limit ${maxLines}). Split it into smaller files with one job each.`);
    }
  } else if (lines > allowed) {
    problems.push(`${file}: grew to ${lines} lines (frozen at ${allowed}). Move code out instead of adding to it.`);
  } else if (lines < allowed) {
    shrunk.push(file);
  }
}

if (update) {
  const next = {};
  for (const [file, allowed] of Object.entries(baseline)) {
    const lines = sizes[file];
    if (lines !== undefined && lines > maxLines) next[file] = Math.min(lines, allowed);
  }
  config.baseline = next;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log('Baseline updated.');
}

if (problems.length > 0) {
  console.error(`File size check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
if (shrunk.length > 0 && !update) {
  console.log(`Smaller than their baseline (run with --update to lock in): ${shrunk.join(', ')}`);
}
console.log(`File size check passed (${Object.keys(sizes).length} files).`);
