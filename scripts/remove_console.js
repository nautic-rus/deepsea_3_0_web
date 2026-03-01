/**
 * Remove all console.log / console.warn / console.error / console.debug / console.info / console.trace
 * from TypeScript source files under src/app.
 *
 * Preserves:
 *  - src/main.ts (bootstrap error handler)
 *
 * Patterns handled:
 *  1. Standalone statement on its own line:  console.xxx(...);
 *  2. try { console.xxx(...); } catch (...) {}   → remove entire try/catch
 *  3. Inside catch/error block as the only statement in a { } body
 *  4. Inline: ... } catch (e) { console.warn(...); }  → ... } catch (e) { }
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob') || null;

// Collect files
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

  // 1) Remove: try { console.xxx(...); } catch (_) {}  or catch (e) {}  (single-line try/catch wrappers)
  //    Matches things like:  try { console.debug('[DxfViewer] ...'); } catch(_) {}
  src = src.replace(/\btry\s*\{\s*console\.(log|warn|error|debug|info|trace)\([^)]*\);\s*\}\s*catch\s*\([^)]*\)\s*\{\s*\}/g, '');

  // 2) Remove standalone console.xxx(...) statements on their own line (possibly with leading whitespace)
  //    This handles multi-arg calls like console.error('msg', err)
  //    Using a greedy approach for the arguments – match balanced parens loosely
  src = src.replace(/^[ \t]*console\.(log|warn|error|debug|info|trace)\([\s\S]*?\);[ \t]*\n?/gm, '');

  // 3) Remove inline console inside catch/error body:
  //    e.g.  { console.warn('x', e); }  →  { }
  //    but only when console.xxx is the only statement
  src = src.replace(/\{\s*console\.(log|warn|error|debug|info|trace)\([^;]*\);\s*\}/g, '{ }');

  // Clean up empty lines left behind (collapse multiple blank lines to one)
  src = src.replace(/\n{3,}/g, '\n\n');

  if (src !== original) {
    const removedCount = (original.match(/console\.(log|warn|error|debug|info|trace)\(/g) || []).length
      - (src.match(/console\.(log|warn|error|debug|info|trace)\(/g) || []).length;
    totalRemoved += removedCount;
    fs.writeFileSync(file, src, 'utf8');
    console.log(`  ✓ ${path.relative(ROOT, file)}  (${removedCount} removed)`);
  }
}

console.log(`\nDone. Removed ${totalRemoved} console statements from ${files.length} files.`);
