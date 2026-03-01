/**
 * Second pass: remove inline console.xxx(...) calls that are part of multi-statement blocks.
 * These are patterns like:
 *   { console.warn('...', err); this.foo = []; ... }
 *   error: (err) => console.warn('...', err)
 *
 * Strategy: replace console.xxx(args); with nothing (keeping the rest of the line).
 * Also handle: error: (err) => console.warn(...) — replace the callback body.
 */

const fs = require('fs');
const path = require('path');

function getFiles(dir, ext) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getFiles(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

const ROOT = path.resolve(__dirname, '..');
const files = getFiles(path.join(ROOT, 'src', 'app'), '.ts');

let totalRemoved = 0;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const original = src;

  // Count before
  const before = (src.match(/console\.(log|warn|error|debug|info|trace)\(/g) || []).length;
  if (before === 0) continue;

  // Pattern A: console.xxx('string literal', variable); — inline with semicolon, part of larger block
  // Match console.xxx( ... ); where args may contain nested parens (one level)
  // We use a non-greedy match up to );
  src = src.replace(/\s*console\.(log|warn|error|debug|info|trace)\((?:[^()]*|\([^()]*\))*\);\s*/g, (match, _level, offset) => {
    // If this is the entire line content (just whitespace + console), replace with newline
    // Otherwise keep a space
    return ' ';
  });

  // Pattern B: arrow with console as sole expression: => console.xxx(...)
  // e.g., error: (err) => console.warn('Failed to delete link', linkId, err)
  src = src.replace(/=>\s*console\.(log|warn|error|debug|info|trace)\((?:[^()]*|\([^()]*\))*\)/g, '=> { }');

  // Clean up double spaces
  src = src.replace(/  +/g, ' ');

  // Clean up empty lines
  src = src.replace(/\n{3,}/g, '\n\n');

  const after = (src.match(/console\.(log|warn|error|debug|info|trace)\(/g) || []).length;
  const removed = before - after;
  totalRemoved += removed;

  if (src !== original) {
    fs.writeFileSync(file, src, 'utf8');
    console.log(`  ✓ ${path.relative(ROOT, file)}  (${removed} removed, ${after} remaining)`);
  }
}

console.log(`\nDone. Removed ${totalRemoved} more console statements.`);
