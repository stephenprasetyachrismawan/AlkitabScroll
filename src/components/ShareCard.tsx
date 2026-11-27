import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CATEGORY_MAP } from '../lib/categories';
import { UI_FONT } from '../lib/fonts';
import type { Lang } from '../lib/i18n';
import { CARD_FONTS, fitFontSize, FORMATS, THEME_MAP, type CardFont, type CardFormat, type CardTheme } from '../lib/shareCards';
import { passageText, TRANSLATIONS, type Translation, type Verse } from '../lib/verses';

const FAMILY: Record<CardFont, string> = {
  lora: 'Lora_500Medium_Italic',
  roman: 'Lora_400Regular',
  caveat: 'Caveat_500Medium',
  display: 'Gabarito_700Bold',
};

type Props = {
  verse: Verse;
  theme: string;
  format: CardFormat;
  /** layout width in points; the card is drawn in proportion to it */
  width: number;
  translation: Translation;
  lang: Lang;
};

function resolve(theme: CardTheme, verse: Verse) {
  if (theme.ground !== 'category') return { ground: theme.ground, ink: theme.ink, accent: theme.accent };
  const s = CATEGORY_MAP[verse.categories[0]].light;
  return { ground: s.paper, ink: s.text, accent: s.accent };
}

/**
 * A verse laid out for sharing: Story (9:16), feed post (4:5) or square.
 * Everything scales from the width, so the small preview and the 1080px export match.
 */
function ShareCardBase({ verse, theme: themeKey, format, width, translation, lang }: Props) {
  const theme = THEME_MAP[themeKey] ?? THEME_MAP.paper;
  const { ground, ink, accent } = resolve(theme, verse);
  const height = Math.round(width * FORMATS[format].ratio);
  const u = width / 360; // one design unit
  const { title, body } = passageText(verse, translation);
  // handwriting only for short passages, so long text stays legible
  const fontKey: CardFont = theme.font === 'caveat' && body.length > 170 ? 'lora' : theme.font;
  const font = CARD_FONTS[fontKey];
  const short = TRANSLATIONS.find((x) => x.key === translation);
  const left = theme.align === 'left';
  const framed = theme.motif === 'frame';

  const padX = (framed ? 44 : 30) * u;
  const top = (format === 'story' ? 64 : 34) * u;
  const bottom = ((format === 'story' ? 70 : 34) + (theme.motif === 'waves' ? 44 : theme.motif === 'branch' ? 70 : 0)) * u;
  // header + reference row + footer
  const reserved = 150 * u + (theme.motif === 'sun' && format === 'story' ? 60 * u : 0);
  const boxW = width - padX * 2;
  const boxH = height - top - bottom - reserved;
  const base = { ...font, max: font.max * Math.min(1.25, format === 'story' ? 1.15 : 1) };
  const size = fitFontSize(body, boxW / u, boxH / u, base) * u;

  const kicker = verse.categories
    .slice(0, 2)
    .map((k) => CATEGORY_MAP[k]?.label[lang])
    .filter(Boolean)
    .join('  ·  ')
    .toUpperCase();

  return (
    <View style={{ width, height, backgroundColor: ground, overflow: 'hidden' }}>
      <MotifLayer motif={theme.motif} accent={accent} width={width} height={height} u={u} format={format} />
      <View style={{ flex: 1, paddingHorizontal: padX, paddingTop: top, paddingBottom: bottom }}>
        <View style={[styles.head, { justifyContent: left ? 'flex-start' : 'center', gap: 10 * u }]}>
          <Text style={{ color: accent, fontFamily: UI_FONT.title, fontSize: 13 * u, letterSpacing: 3 * u }}>SELAH</Text>
          <View style={{ width: 4 * u, height: 4 * u, borderRadius: 2 * u, backgroundColor: accent, opacity: 0.6 }} />
          <Text numberOfLines={1} style={{ color: ink, opacity: 0.7, fontFamily: UI_FONT.bold, fontSize: 10 * u, letterSpacing: 1.6 * u, flexShrink: 1 }}>
            {kicker}
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          {left ? <Text style={{ color: accent, fontFamily: UI_FONT.serifBold, fontSize: 80 * u, lineHeight: 80 * u, marginBottom: -26 * u, opacity: 0.55 }}>“</Text> : null}
          <Text
            style={{
              color: ink,
              fontFamily: FAMILY[fontKey],
              fontSize: size,
              lineHeight: size * font.lineHeight,
              textAlign: theme.align,
              letterSpacing: fontKey === 'display' ? -0.3 * u : 0,
            }}
          >
            {body}
          </Text>
          <View style={[styles.refRow, { justifyContent: left ? 'flex-start' : 'center', gap: 10 * u, marginTop: 22 * u }]}>
            <View style={{ width: 22 * u, height: 2 * u, backgroundColor: accent }} />
            <Text style={{ color: ink, fontFamily: UI_FONT.display, fontSize: 15 * u, letterSpacing: 0.4 * u }}>{title}</Text>
            <Text style={{ color: accent, fontFamily: UI_FONT.bold, fontSize: 10 * u, letterSpacing: 1 * u }}>{short?.short}</Text>
          </View>
        </View>

        <Text style={{ color: ink, opacity: 0.5, fontFamily: UI_FONT.regular, fontSize: 8.5 * u, textAlign: theme.align }}>
          {short?.copyright} · Selah
        </Text>
      </View>
    </View>
  );
}

export const ShareCard = memo(ShareCardBase);

/** One quiet drawn element per theme, plain Views so nothing extra ships. */
function MotifLayer({ motif, accent, width, height, u, format }: { motif: CardTheme['motif']; accent: string; width: number; height: number; u: number; format: CardFormat }) {
  if (motif === 'sun') {
    const d = width * 0.62;
    const horizon = format === 'story' ? height * 0.2 : height * 0.16;
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, backgroundColor: accent, opacity: 0.16, left: (width - d) / 2, top: horizon - d / 2 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: horizon, height: 1.5 * u, backgroundColor: accent, opacity: 0.35 }} />
      </View>
    );
  }
  if (motif === 'branch') {
    const leaves = [0, 1, 2, 3, 4];
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}>
        <View style={{ position: 'absolute', left: -20 * u, bottom: 40 * u, width: 190 * u, height: 1.5 * u, backgroundColor: accent, transform: [{ rotate: '-24deg' }] }} />
        {leaves.map((i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: (10 + i * 32) * u,
              bottom: (34 + i * 14) * u + (i % 2 ? -14 * u : 8 * u),
              width: 26 * u,
              height: 11 * u,
              borderRadius: 13 * u,
              backgroundColor: accent,
              transform: [{ rotate: i % 2 ? '-50deg' : '10deg' }],
            }}
          />
        ))}
      </View>
    );
  }
  if (motif === 'waves') {
    const w = 36 * u;
    const count = Math.ceil(width / w) + 1;
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.35 }]}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={{ position: 'absolute', bottom: (22 + row * 14) * u, left: row % 2 ? -w / 2 : 0, flexDirection: 'row' }}>
            {Array.from({ length: count }, (_, i) => (
              <View key={i} style={{ width: w, height: w / 2, borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2, borderWidth: 1.5 * u, borderBottomWidth: 0, borderColor: accent }} />
            ))}
          </View>
        ))}
      </View>
    );
  }
  if (motif === 'frame') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ position: 'absolute', top: 16 * u, left: 16 * u, right: 16 * u, bottom: 16 * u, borderWidth: 1.5 * u, borderColor: accent, opacity: 0.7 }} />
        <View style={{ position: 'absolute', top: 22 * u, left: 22 * u, right: 22 * u, bottom: 22 * u, borderWidth: 0.75 * u, borderColor: accent, opacity: 0.45 }} />
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  refRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
});
