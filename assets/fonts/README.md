# Fonts

Latin subsets of Google Fonts families, all under the SIL Open Font License 1.1
(https://openfontlicense.org): Lora, Caveat, Gabarito, Figtree.

Subsetting keeps Basic Latin, Latin-1, Latin Extended A/B and Additional, punctuation,
currency and a few symbols (♥ ™ arrows), which covers Indonesian and English. Characters outside the
subset (emoji, other scripts in comments or chat) fall back to the system font.
Nine files, about 0.6 MB in all.

To regenerate from a full TTF (`pip install fonttools`):

```sh
python3 -m fontTools.subset Full.ttf --output-file=assets/fonts/Name_Weight.ttf \
  --unicodes="U+0020-007E,U+00A0-024F,U+0259,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-2122,U+2190-2193,U+2212,U+2665,U+FB01-FB02" \
  --layout-features='*' --no-hinting --desubroutinize
```

The file name is the font family name used in `src/lib/fonts.ts`; keep them in sync with the
`expo-font` entry in `app.json` and `src/lib/useAppFonts.ts`.
