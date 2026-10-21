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

// Psalm superscriptions ("Mazmur Daud.", "Untuk pemimpin biduan.") are headings in
// the printed Bible, not verse text. sabda puts them inside verse 1.
const SUPERSCRIPTION = /^(?:(?:Mazmur|Dari|Nyanyian|Untuk|Doa|Pengajaran|Miktam|Maskil|Syair|Kepada|Pada|Menurut|Bagi)\b[^.]*\.\s*)+/;

function clean(text, version, isPsalm, n) {
  let t = decode(text).replace(/<[^>]+>/g, '');
  let printed = null;
  if (version === 'kjv') {
    t = t
      .replace(/\(\d+\)/g, '') // Strong's numbers
      .replace(/[@_]/g, ' ')
      .replace(/\{[^}]*\}/g, '') // translators' footnotes
      .replace(/[[\]]/g, ''); // italics markers
    if (isPsalm) t = t.trim().replace(/^[A-Z]{2,}\.\s+/, ''); // Psalm 119 acrostic letters (NUN.)
  } else {
    // "(46-11)" = the verse number as printed in the LAI Bible (sabda uses English numbering).
    const m = t.match(/\((\d+)-(\d+)\)\s*/);
    if (m) {
      printed = Number(m[2]);
      t = t.slice(m.index + m[0].length); // heading before the marker is a superscription
    } else if (isPsalm && n === 1) {
      t = t.replace(SUPERSCRIPTION, '');
    }
  }
  t = t.replace(/\s+/g, ' ').replace(/\s+([,.;:?!])/g, '$1').trim();
  return { text: t, printed };
}

function parse(xml, version, ref) {
  const isPsalm = /^Mzm /.test(ref);
  // BIMK sometimes merges verses; the merged one only says "(2:8)". Drop it after validation.
  let title = decode((xml.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '').replace(/^Psalms /, 'Psalm ');
  const verses = [...xml.matchAll(/<verse>([\s\S]*?)<\/verse>/g)].map((m) => {
    const num = Number((m[1].match(/<number>(\d+)<\/number>/) ?? [])[1]);
    const raw = (m[1].match(/<text>([\s\S]*?)<\/text>/) ?? [])[1] ?? '';
    const { text, printed } = clean(raw, version, isPsalm, num);
    return { n: num, text, printed };
  });
  const rawNumbers = verses.map((v) => v.n);
  for (let i = verses.length - 1; i > 0; i--) {
    if (/^\(\d+:\d+\)$/.test(verses[i].text)) verses.splice(i, 1);
  }
  // Show Psalm references the way the LAI Bible prints them.
  if (verses.length && verses[0].printed) {
    const first = verses[0].printed;
    const last = verses[verses.length - 1].printed ?? first + verses.length - 1;
    title = title.replace(/:\d+(-\d+)?$/, first === last ? `:${first}` : `:${first}-${last}`);
    let k = first;
    for (const v of verses) {
      v.n = v.printed ?? k;
      k = v.n + 1;
    }
  }
  return { title, verses: verses.map(({ n, text }) => ({ n, text })), rawNumbers };
}

function expectedNumbers(ref) {
  const m = ref.match(/:(\d+)(?:-(\d+))?$/);
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
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
      const { title, verses, rawNumbers } = parse(await fetchXml(ref, code), key, ref);
      // sabda silently returns another verse for out-of-range refs, so check the numbers.
      if (rawNumbers.join(',') !== expectedNumbers(ref).join(',') || verses.some((v) => !v.text)) {
        problems.push(`${key} ${ref}: got verses ${rawNumbers.join(',')}`);
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
