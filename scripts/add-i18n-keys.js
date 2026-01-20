#!/usr/bin/env node
// Simple script to merge new MENU.* keys into public/i18n/en.json and ru.json
// Usage: node scripts/add-i18n-keys.js missing-keys.json
// missing-keys.json should contain an array of keys, e.g. ["MENU.DASHBOARD","MENU.PROJECTS"]

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const enPath = path.join(root, 'public', 'i18n', 'en.json');
const ruPath = path.join(root, 'public', 'i18n', 'ru.json');

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return {}; }
}

function saveJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function humanizeKey(k) {
  // MENU.SOME_KEY -> Some Key
  return k.replace(/^MENU\./, '').replace(/_/g, ' ').toLowerCase().replace(/(^| )([a-z])/g, (m, p1, p2) => p2.toUpperCase());
}

function main() {
  const arg = process.argv[2];
  if (!arg) { console.error('Usage: node scripts/add-i18n-keys.js missing-keys.json'); process.exit(2); }
  const missing = JSON.parse(fs.readFileSync(arg, 'utf8'));
  if (!Array.isArray(missing)) { console.error('missing-keys.json must be an array of keys'); process.exit(2); }

  const en = loadJson(enPath);
  const ru = loadJson(ruPath);

  let addedEn = 0, addedRu = 0;
  for (const k of missing) {
    if (typeof k !== 'string') continue;
    if (!(k in en)) { en[k] = humanizeKey(k); addedEn++; }
    if (!(k in ru)) { ru[k] = humanizeKey(k); addedRu++; }
  }

  if (addedEn || addedRu) {
    saveJson(enPath, en);
    saveJson(ruPath, ru);
    console.log(`Added ${addedEn} keys to en.json and ${addedRu} keys to ru.json`);
  } else {
    console.log('No new keys to add');
  }
}

main();
