import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CATEGORY_MAP, hashString, type FontKey } from '../lib/categories';
import { UI_FONT, VERSE_FONTS } from '../lib/fonts';
import type { Lang } from '../lib/i18n';
import { passageText, TRANSLATIONS, type Translation, type Verse } from '../lib/verses';

type Props = {
  verse: Verse;
  width: number;
  height: number;
  translation: Translation;
  lang: Lang;
  dark: boolean;
  /** Pin a category's look (e.g. the route that picked this verse). */
  category?: string;
  variant?: number;
  badge?: string;
  /** Space reserved at the bottom (e.g. reels overlay / tab bar). */
  bottomInset?: number;
  rightInset?: number;
  /** Space reserved at the top (e.g. overlay header in reels). */
  topInset?: number;
};

const LAYOUTS = 3;

/** Largest font size at which the text, word-wrapped, fits the box. */
function fitFontSize(text: string, w: number, h: number, font: { charWidth: number; lineHeight: number; max: number }) {
  const words = text.split(' ');
  for (let size = font.max; size > 12; size -= 1) {
    const perLine = Math.floor(w / (size * font.charWidth * 1.08)); // 8% safety margin
    let lines = 1;
    let used = 0;
    for (const word of words) {
      const len = word.length + (used ? 1 : 0);
      if (used + len > perLine) {
        lines++;
        used = word.length;
      } else used += len;
    }
    if (lines * size * font.lineHeight <= h) return size;
  }
  return 12;
}

function VerseCardBase({
  verse,
  width,
  height,
  translation,
  lang,
  dark,
  category,
  variant,
  badge,
  bottomInset = 0,
  rightInset = 0,
  topInset = 0,
}: Props) {
  const seed = hashString(verse.id);
  const cat = CATEGORY_MAP[category && verse.categories.includes(category) ? category : verse.categories[0]];
  const style = dark ? cat.dark : cat.light;
  const layout = (variant ?? seed) % LAYOUTS;
  const { title, parts, body } = passageText(verse, translation);
  const multi = parts.length > 1;

  // Handwriting only for short passages, so long text stays legible.
  let fontKey: FontKey = style.fonts[seed % style.fonts.length];
  if (fontKey === 'caveat' && body.length > 170) fontKey = 'lora';
  const font = VERSE_FONTS[fontKey];

  const padX = Math.max(22, width * 0.07);
  const padTop = Math.max(24, height * 0.05) + topInset;
  const framed = layout === 2;
  const tagsH = 34 * (verse.categories.length > 2 || badge ? 2 : 1);
  const boxW = width - padX * 2 - rightInset - (framed ? 40 : 0);
  // reserved: tags, reference row, copyright line, frame padding, quote mark
  const boxH = height - padTop - bottomInset - tagsH - 100 - (framed ? 76 : 0) - (layout === 1 ? 50 : 0);
  const fitText = multi ? parts.map((p) => `${p.n} ${p.text}`).join(' ') : body;
  const fontSize = fitFontSize(fitText, boxW, boxH, font);
  const align = layout === 1 ? 'left' : 'center';
  const copyright = TRANSLATIONS.find((x) => x.key === translation)?.copyright ?? '';

  return (
    <LinearGradient colors={style.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ width, height, overflow: 'hidden' }}>
      {/* soft decorative glow */}
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: style.accent,
            width: width * 0.9,
            height: width * 0.9,
            borderRadius: width,
            top: layout === 2 ? -width * 0.45 : height - width * 0.5,
            left: layout === 1 ? -width * 0.4 : width * 0.3,
          },
        ]}
      />

      <View style={[styles.inner, { paddingHorizontal: padX, paddingTop: padTop, paddingBottom: bottomInset + 24, paddingRight: padX + rightInset }]}>
        <View style={styles.tags}>
          {badge ? (
            <View style={[styles.tag, { backgroundColor: style.accent }]}>
              <Text style={[styles.tagText, { color: '#fff' }]}>{badge}</Text>
            </View>
          ) : null}
          {verse.categories.slice(0, 3).map((k) => {
            const cc = CATEGORY_MAP[k];
            if (!cc) return null;
            return (
              <View key={k} style={[styles.tag, { borderColor: style.accent + '88', backgroundColor: style.accent + '1F' }]}>
                <Text style={[styles.tagText, { color: style.text }]}>
                  {cc.emoji} #{cc.label[lang]}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.body, layout === 2 && [styles.framed, { borderColor: style.accent + '66' }]]}>
          {layout === 1 ? (
            <Text style={[styles.quoteMark, { color: style.accent, fontSize: 64, lineHeight: 64 }]}>“</Text>
          ) : null}
          <Text
            style={{
              color: style.text,
              fontFamily: font.family,
              fontSize,
              lineHeight: fontSize * font.lineHeight,
              textAlign: align,
            }}
          >
            {multi
              ? parts.map((p, i) => (
                  <Text key={p.n}>
                    <Text style={{ fontSize: fontSize * 0.55, color: style.accent, fontFamily: UI_FONT.bold }}>{p.n} </Text>
                    {p.text}
                    {i < parts.length - 1 ? ' ' : ''}
                  </Text>
                ))
              : body}
          </Text>
          <View style={[styles.refRow, { justifyContent: align === 'left' ? 'flex-start' : 'center' }]}>
            <View style={[styles.rule, { backgroundColor: style.accent }]} />
            <Text style={[styles.ref, { color: style.text }]}>{title}</Text>
          </View>
        </View>

        <Text style={[styles.copyright, { color: style.text }]}>{copyright}</Text>
      </View>
    </LinearGradient>
  );
}

export const VerseCard = memo(VerseCardBase);

const styles = StyleSheet.create({
  glow: { position: 'absolute', opacity: 0.12 },
  inner: { flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderWidth: 1, borderColor: 'transparent', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: UI_FONT.semibold, fontSize: 12 },
  body: { flex: 1, justifyContent: 'center' },
  framed: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 22, marginVertical: 16 },
  quoteMark: { fontFamily: UI_FONT.title, marginBottom: -8, opacity: 0.6 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  rule: { width: 28, height: 2, borderRadius: 2 },
  ref: { fontFamily: UI_FONT.serifBold, fontSize: 15, letterSpacing: 0.5 },
  copyright: { fontFamily: UI_FONT.regular, fontSize: 10, opacity: 0.55, textAlign: 'center' },
});
