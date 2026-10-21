// Fetches verse text for every catalog entry from alkitab.sabda.org.
// TB and BIMK © Lembaga Alkitab Indonesia (LAI). KJV is public domain.
// Usage: node scripts/fetch-verses.mjs  -> writes data/verses.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, 'data', 'raw');
fs.mkdirSync(cacheDir, { recursive: true });

const VERSIONS = { tb: 'tb', bimk: 'bis', kjv: 'kjv' };

function parseCatalog() {
  const lines = fs.readFileSync(path.join(root, 'scripts', 'catalog.txt'), 'utf8').split('\n');
  const byRef = new Map();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [ref, kjv, cats] = line.split('|').map((s) => s.trim());
    const entry = byRef.get(ref) ?? { ref, kjvRef: kjv === '-' ? ref : kjv, categories: [] };
    for (const c of cats.split(',').map((s) => s.trim())) {
      if (!entry.categories.includes(c)) entry.categories.push(c);
    }
    byRef.set(ref, entry);
  }
  return [...byRef.values()];
}

function expectedCount(ref) {
  const m = ref.match(/:(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`bad ref ${ref}`);
  return m[2] ? Number(m[2]) - Number(m[1]) + 1 : 1;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchXml(ref, version) {
  const file = path.join(cacheDir, `${version}__${ref.replace(/[^\w-]/g, '_')}.xml`);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const url = `https://alkitab.sabda.org/api/passage.php?passage=${encodeURIComponent(ref)}&version=${version}`;
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      const text = await res.text();
      if (res.ok && text.includes('<verse>')) {
        fs.writeFileSync(file, text);
        return text;
      }
    } catch {}
    await sleep(1000 * Math.min(attempt, 5));
  }
  throw new Error(`failed ${version} ${ref}`);
}

function decode(s) {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function clean(text, version) {
  let t = decode(text);
  t = t.replace(/<[^>]+>/g, '');
  if (version === 'kjv') {
    t = t.replace(/\(\d+\)/g, '').replace(/[@_]/g, ' ');
  }
  return t.replace(/\s+/g, ' ').replace(/\s+([,.;:?!])/g, '$1').trim();
}

function parse(xml, version) {
  const title = (xml.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '';
  const verses = [...xml.matchAll(/<verse>([\s\S]*?)<\/verse>/g)].map((m) => {
    const num = Number((m[1].match(/<number>(\d+)<\/number>/) ?? [])[1]);
    const text = (m[1].match(/<text>([\s\S]*?)<\/text>/) ?? [])[1] ?? '';
    return { n: num, text: clean(text, version) };
  });
  return { title: decode(title), verses };
}

const catalog = parseCatalog();
const out = new Array(catalog.length);
const problems = [];
let done = 0;
async function work(entry, i) {
  const item = { id: entry.ref.replace(/\s+/g, '').replace(/:/g, '.'), ref: entry.ref, kjvRef: entry.kjvRef, categories: entry.categories, text: {} };
  for (const [key, code] of Object.entries(VERSIONS)) {
    const ref = key === 'kjv' ? entry.kjvRef : entry.ref;
    try {
      const { title, verses } = parse(await fetchXml(ref, code), key);
      if (verses.length !== expectedCount(ref) || verses.some((v) => !v.text)) {
        problems.push(`${key} ${ref}: got ${verses.length} verses`);
      }
      item.text[key] = { title, verses };
    } catch (e) {
      problems.push(String(e.message));
    }
  }
  out[i] = item;
  process.stdout.write(`\r${++done}/${catalog.length} ${entry.ref}        `);
}

// Small worker pool: polite to the server, but not stalled by one slow request.
let next = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (next < catalog.length) {
      const i = next++;
      await work(catalog[i], i);
    }
  }),
);

fs.writeFileSync(path.join(root, 'data', 'verses.json'), JSON.stringify(out, null, 1));
console.log(`\nwrote ${out.length} entries`);
if (problems.length) console.log('PROBLEMS:\n' + problems.join('\n'));
