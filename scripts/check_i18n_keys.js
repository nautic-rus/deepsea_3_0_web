const fs = require('fs');
const path = require('path');

function walk(dir, files=[]) {
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (f === 'node_modules' || f === 'dist' || f === '.git') continue;
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function extractKeysFromFile(content) {
  const keys = new Set();
  // patterns: 'components....' | translate
  const reSingleTranslate = /['\"](components\.[^'\"]+)['\"]\s*\|\s*translate/g;
  const reSingleTranslateDouble = /['\"](components\.[^'\"]+)['\"]\s*\|\s*translate/g; // same
  const reInstantSingle = /translate\.instant\(\s*['\"](components\.[^'\"]+)['\"]\s*\)/g;
  const reGeneric = /['\"](components\.[A-Za-z0-9_\.\-]+)['\"]/g;

  let m;
  while ((m = reSingleTranslate.exec(content)) !== null) keys.add(m[1]);
  while ((m = reInstantSingle.exec(content)) !== null) keys.add(m[1]);

  // also capture any components.* used as strings (some code uses them dynamically)
  while ((m = reGeneric.exec(content)) !== null) {
    const k = m[1];
    if (k && k.startsWith('components.')) keys.add(k);
  }

  return Array.from(keys);
}

function flatten(obj, prefix='') {
  const out = new Set();
  for (const k of Object.keys(obj||{})) {
    const p = prefix ? prefix + '.' + k : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      for (const sub of flatten(obj[k], p)) out.add(sub);
    } else {
      out.add(p);
    }
  }
  return out;
}

function main() {
  const workspace = path.resolve(__dirname, '..');
  const src = path.join(workspace, 'src');
  const i18nDir = path.join(workspace, 'public', 'i18n');
  const files = walk(src).filter(f => f.endsWith('.ts') || f.endsWith('.html') || f.endsWith('.js'));
  const used = new Set();
  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const keys = extractKeysFromFile(content);
      keys.forEach(k => used.add(k));
    } catch (e) {
      // ignore
    }
  }

  const enPath = path.join(i18nDir, 'en.json');
  const ruPath = path.join(i18nDir, 'ru.json');
  let en = {}, ru = {};
  try { en = JSON.parse(fs.readFileSync(enPath,'utf8')); } catch(e) { console.error('Failed to read en.json', e.message); }
  try { ru = JSON.parse(fs.readFileSync(ruPath,'utf8')); } catch(e) { console.error('Failed to read ru.json', e.message); }

  const enKeys = flatten(en);
  const ruKeys = flatten(ru);

  const usedList = Array.from(used).sort();
  const missingInEn = [];
  const missingInRu = [];
  for (const k of usedList) {
    if (!enKeys.has(k)) missingInEn.push(k);
    if (!ruKeys.has(k)) missingInRu.push(k);
  }

  console.log('Total translate-like keys found in src:', usedList.length);
  console.log('Missing in en.json:', missingInEn.length);
  missingInEn.slice(0,200).forEach(k => console.log('  EN_MISSING:', k));
  console.log('Missing in ru.json:', missingInRu.length);
  missingInRu.slice(0,200).forEach(k => console.log('  RU_MISSING:', k));

  if (missingInEn.length === 0 && missingInRu.length === 0) {
    console.log('All keys present in both en.json and ru.json');
  } else {
    console.log('\nSummary:');
    console.log(' - Missing in en.json:', missingInEn.length);
    console.log(' - Missing in ru.json:', missingInRu.length);
    console.log('\nIf you want, I can automatically add missing keys (copying values from the other locale or using the key name).');
  }
}

main();
