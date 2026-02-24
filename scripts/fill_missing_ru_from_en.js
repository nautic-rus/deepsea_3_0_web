const fs = require('fs');
const path = require('path');

const enPath = path.resolve(__dirname, '..', 'public', 'i18n', 'en.json');
const ruPath = path.resolve(__dirname, '..', 'public', 'i18n', 'ru.json');

function flatten(obj, prefix = '') {
  const res = {};
  for (const k of Object.keys(obj || {})) {
    const v = obj[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(res, flatten(v, key));
    } else {
      res[key] = v;
    }
  }
  return res;
}

function unflatten(flat) {
  const out = {};
  for (const k of Object.keys(flat)) {
    const parts = k.split('.');
    let cur = out;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i === parts.length - 1) {
        cur[p] = flat[k];
      } else {
        cur[p] = cur[p] || {};
        cur = cur[p];
      }
    }
  }
  return out;
}

try {
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

  const fEn = flatten(en);
  const fRu = flatten(ru);

  const missing = [];
  for (const key of Object.keys(fEn)) {
    if (!(key in fRu)) missing.push(key);
  }

  if (!missing.length) {
    console.log('No missing keys in ru.json (compared to en.json)');
    process.exit(0);
  }

  console.log('Missing keys:', missing.length);
  // backup ru.json
  fs.copyFileSync(ruPath, ruPath + '.bak');

  // fill missing keys by copying english values
  for (const k of missing) {
    const val = fEn[k];
    fRu[k] = typeof val === 'string' ? val : val;
  }

  const merged = unflatten(fRu);
  fs.writeFileSync(ruPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log('ru.json updated; backup saved as ru.json.bak');
} catch (e) {
  console.error('Failed to merge:', e);
  process.exit(1);
}
