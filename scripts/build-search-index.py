"""Builds data/search-semantic.ts: the offline "meaning" layer of verse search and Curhat.

The phone cannot run a 118 MB embedding model, so the model runs here, once, and what the app
ships is what the model concluded:

  1. Every passage in data/verses.json is embedded in all three translations with
     multilingual-e5-small (int8 ONNX, Indonesian + English in one space).
  2. ~40k words people actually type (every word in the verses, the 30k most frequent
     Indonesian words incl. slang like "capek", "galau", "nyerah", and 10k English words)
     are embedded one by one.
  3. For each word we keep the passages it points to unusually strongly (z-score over all
     passages, so the model's usual "everything is 0.85 similar" bias cancels out), and the
     categories it leans toward (similarity to each category's centroid).
  4. Scores are weighted by how informative the word is (SIF: a / (a + frequency)), so "aku"
     and "yang" vanish and "selingkuh" or "rajawali" carry weight.

At query time the app sums these per-word votes. That gives semantic matches for a sentence
with no exact word in common with the verse, in about 1 MB of text, offline, in under 5 ms.

Usage (needs Python 3.10+):
  pip install onnxruntime tokenizers numpy wordfreq
  python scripts/build-search-index.py /path/to/multilingual-e5-small
The model folder must hold model_quantized.onnx and tokenizer.json
(Xenova/multilingual-e5-small, MIT). Re-run after editing scripts/catalog.txt.
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import onnxruntime as ort
import wordfreq
from tokenizers import Tokenizer

ROOT = Path(__file__).resolve().parent.parent
MODEL = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / '.models' / 'multilingual-e5-small')
OUT = ROOT / 'data' / 'search-semantic.ts'

TRANSLATIONS = ('tb', 'bimk', 'kjv')
WORD = re.compile(r"[a-z]+(?:-[a-z]+)?")
B36 = '0123456789abcdefghijklmnopqrstuvwxyz'

# Passage votes: keep at most this many passages per word, only clear outliers.
TOP_PASSAGES = 10
PASSAGE_Z = 2.2
# Category votes.
TOP_CATS = 3
CAT_Z = 1.0
SIF_A = 1e-3


def load_model():
    tok = Tokenizer.from_file(str(MODEL / 'tokenizer.json'))
    tok.enable_truncation(256)
    tok.enable_padding()
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 4
    sess = ort.InferenceSession(str(MODEL / 'model_quantized.onnx'), opts)

    def embed(texts, bs=128):
        out = []
        for i in range(0, len(texts), bs):
            enc = tok.encode_batch(texts[i : i + bs])
            ids = np.array([e.ids for e in enc], dtype=np.int64)
            mask = np.array([e.attention_mask for e in enc], dtype=np.int64)
            h = sess.run(None, {'input_ids': ids, 'attention_mask': mask, 'token_type_ids': np.zeros_like(ids)})[0]
            v = (h * mask[..., None]).sum(1) / mask.sum(1, keepdims=True)
            out.append(v / np.linalg.norm(v, axis=1, keepdims=True))
        return np.vstack(out).astype(np.float32)

    return embed


def words(s):
    return WORD.findall(s.lower())


def main():
    verses = json.loads((ROOT / 'data' / 'verses.json').read_text())
    categories = re.findall(r"^\s*c\('(\w+)'", (ROOT / 'src' / 'lib' / 'categories.ts').read_text(), re.M)
    embed = load_model()
    n = len(verses)

    # 1. Passages, every translation.
    docs = [
        'passage: ' + ' '.join(x['text'] for x in v['text'][t]['verses'])
        for v in verses
        for t in TRANSLATIONS
    ]
    doc_vecs = embed(docs)  # (n*3, 384)

    # Category centroids from the passages tagged with each category.
    cat_vecs = []
    for c in categories:
        rows = [i * 3 + k for i, v in enumerate(verses) if c in v['categories'] for k in range(3)]
        m = doc_vecs[rows].mean(0) if rows else np.zeros(doc_vecs.shape[1])
        cat_vecs.append(m / (np.linalg.norm(m) + 1e-9))
    cat_vecs = np.array(cat_vecs, dtype=np.float32)

    # 2. Vocabulary.
    corpus = Counter()
    for v in verses:
        for t in TRANSLATIONS:
            for x in v['text'][t]['verses']:
                corpus.update(words(x['text']))
    ok = re.compile(r'[a-z]{2,}(?:-[a-z]+)?$')
    idw = [w for w in wordfreq.top_n_list('id', 60000) if ok.fullmatch(w)][:30000]
    enw = [w for w in wordfreq.top_n_list('en', 20000) if ok.fullmatch(w)][:10000]
    vocab = list(dict.fromkeys([w for w in corpus if ok.fullmatch(w)] + idw + enw))
    word_vecs = embed(['query: ' + w for w in vocab], bs=256)
    freq = np.array([max(wordfreq.word_frequency(w, 'id'), wordfreq.word_frequency(w, 'en'), 1e-7) for w in vocab])
    weight = SIF_A / (SIF_A + freq)

    # 3a. Word -> passage votes (best translation per passage).
    sp = (word_vecs @ doc_vecs.T).reshape(len(vocab), n, 3).max(2)
    # Some passages sit close to every word ("hubs"); centre each passage over the vocabulary
    # first so they stop answering every query, then score each word against all passages.
    sp = sp - sp.mean(0, keepdims=True)
    z = (sp - sp.mean(1, keepdims=True)) / (sp.std(1, keepdims=True) + 1e-9)
    # 3b. Word -> category votes.
    sc = word_vecs @ cat_vecs.T
    sc = sc - sc.mean(0, keepdims=True)  # same hub correction for categories
    zc = (sc - sc.mean(1, keepdims=True)) / (sc.std(1, keepdims=True) + 1e-9)

    raw_p, raw_c = {}, {}
    for i, w in enumerate(vocab):
        top = np.argsort(-z[i])[:TOP_PASSAGES]
        raw_p[w] = [(int(p), float(weight[i] * (z[i, p] - PASSAGE_Z))) for p in top if z[i, p] > PASSAGE_Z]
        topc = np.argsort(-zc[i])[:TOP_CATS]
        raw_c[w] = [(int(c), float(weight[i] * (zc[i, c] - CAT_Z))) for c in topc if zc[i, c] > CAT_Z]

    # 4. Quantise to one base-36 digit (1..35) against a high percentile, so a few huge
    #    outliers do not flatten everything else.
    def scale(raw):
        vals = np.array([s for lst in raw.values() for _, s in lst])
        return np.percentile(vals, 99.5)

    sp_max, sc_max = scale(raw_p), scale(raw_c)
    q = lambda s, m: B36[max(1, min(35, round(s / m * 35)))]

    entries = {}
    for w in vocab:
        ps = ''.join(B36[p // 36] + B36[p % 36] + q(s, sp_max) for p, s in raw_p[w] if round(s / sp_max * 35) >= 1)
        cs = ''.join(chr(97 + c) + q(s, sc_max) for c, s in raw_c[w] if round(s / sc_max * 35) >= 1)
        if ps or cs:
            entries[w] = ps + ('|' + cs if cs else '')

    out = {
        'version': 1,
        'model': 'intfloat/multilingual-e5-small (int8)',
        'passages': [v['id'] for v in verses],
        'categories': categories,
        # word -> "<pp s>*|<c s>*": passage index as 2 base-36 chars + score char; category letter + score char
        'words': entries,
    }
    # Shipped as one string literal and parsed on the first search: a 36k-key object literal
    # would be compiled into the bundle and evaluated at startup.
    body = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    assert "'" not in body and '\\' not in body  # safe to wrap in single quotes unescaped
    OUT.write_text(
        '// Generated by scripts/build-search-index.py. Do not edit by hand.\n'
        f"export const SEMANTIC_JSON = '{body}';\n"
    )
    print(f'{len(entries)} words, {OUT.stat().st_size / 1024:.0f} KB -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
