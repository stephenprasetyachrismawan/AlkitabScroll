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
};

const LAYOUTS = 3;

/** Pick a font size so the passage fills the box but stays readable. */
function fitFontSize(chars: number, w: number, h: number, font: { scale: number; lineHeight: number }) {
  const area = w * h;
  // average glyph ≈ 0.5em wide; line box = lineHeight em
  const size = Math.sqrt(area / (chars * 0.52 * font.lineHeight)) * 0.86;
  return Math.max(13, Math.min(34, size)) * Math.min(font.scale, 1.3);
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

  const padX = Math.max(22, width * 0.08);
  const padTop = Math.max(40, height * 0.1);
  const boxW = width - padX * 2 - rightInset;
  const boxH = height - padTop - bottomInset - 110;
  const fontSize = fitFontSize(body.length + (multi ? parts.length * 3 : 0), boxW, boxH, font);
  const align = layout === 1 ? 'left' : 'center';
  const copyright = TRANSLATIONS.find((x) => x.key === translation)?.copyright ?? '';

  return (
    <LinearGradient colors={style.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ width, height }}>
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
            <Text style={[styles.quoteMark, { color: style.accent, fontSize: fontSize * 3, lineHeight: fontSize * 3 }]}>“</Text>
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
