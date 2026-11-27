import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useFontScale } from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { DURATION, enter } from '../lib/motion';
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
  /**
   * Feed only: the card on screen. Its parts arrive in reading order
   * (tags, verse, reference) each time it becomes active. Omit for static cards.
   */
  active?: boolean;
  /** Image export: ignore the phone's font size so shared pictures look the same everywhere. */
  print?: boolean;
};

/** One part of the card rising into place; `p` goes 0 → 1. */
function useRise(p: SharedValue<number>, distance: number) {
  return useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * distance }],
  }));
}

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
  active,
  print,
}: Props) {
  // Text on the card grows with the phone's font size (capped), and the verse is fitted
  // to whatever room is left, so a large setting never pushes text off the card.
  const phoneScale = useFontScale(1.3);
  const scale = print ? 1 : phoneScale;
  const animate = active !== undefined;
  const pTags = useSharedValue(animate ? 0 : 1);
  const pBody = useSharedValue(animate ? 0 : 1);
  const pRef = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    if (active) {
      pTags.value = withTiming(1, enter());
      pBody.value = withDelay(DURATION.stagger, withTiming(1, enter(DURATION.enter + 120)));
      pRef.value = withDelay(DURATION.stagger * 3, withTiming(1, enter()));
    } else {
      // reset quietly while off-screen so the next arrival plays again
      pTags.value = 0.001;
      pBody.value = 0.001;
      pRef.value = 0.001;
    }
  }, [active, animate, pTags, pBody, pRef]);
  const tagsStyle = useRise(pTags, 12);
  const bodyStyle = useRise(pBody, 22);
  const refStyle = useRise(pRef, 10);

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
  const tagsH = 30 * scale;
  const boxW = width - padX * 2 - rightInset - (framed ? 40 : 0);
  // reserved: tags, reference row, copyright line, frame padding, quote mark
  const boxH = height - padTop - bottomInset - tagsH - 100 * scale - (framed ? 76 : 0) - (layout === 1 ? 50 : 0);
  const fitText = multi ? parts.map((p) => `${p.n} ${p.text}`).join(' ') : body;
  // The verse is sized here, not by the system: a bigger font setting raises the ceiling,
  // then fitting brings it back down if the passage is long.
  const fontSize = fitFontSize(fitText, boxW, boxH, { ...font, max: Math.round(font.max * scale) });
  const align = layout === 1 ? 'left' : 'center';
  const copyright = TRANSLATIONS.find((x) => x.key === translation)?.copyright ?? '';

  const kicker = verse.categories
    .slice(0, 2)
    .map((k) => CATEGORY_MAP[k]?.label[lang])
    .filter(Boolean)
    .join('  ·  ');

  return (
    <View style={{ width, height, overflow: 'hidden', backgroundColor: style.paper }}>
      <View style={[styles.inner, { paddingHorizontal: padX, paddingTop: padTop, paddingBottom: bottomInset + 24, paddingRight: padX + rightInset }]}>
        <Animated.View style={[styles.tags, { justifyContent: align === 'left' ? 'flex-start' : 'center' }, tagsStyle]}>
          {badge ? (
            <View style={[styles.stamp, { borderColor: style.accent }]}>
              <Text style={[styles.stampText, { color: style.accent }]} maxFontSizeMultiplier={scale} numberOfLines={1}>
                {badge}
              </Text>
            </View>
          ) : null}
          <View style={styles.kickerRow}>
            <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={13} color={style.accent} />
            <Text style={[styles.kicker, { color: style.text }]} maxFontSizeMultiplier={scale} numberOfLines={1}>
              {kicker.toUpperCase()}
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.body, layout === 2 && [styles.framed, { borderColor: style.accent + '55' }], bodyStyle]}>
          {layout === 1 ? (
            <Text allowFontScaling={false} style={[styles.quoteMark, { color: style.accent }]}>
              “
            </Text>
          ) : null}
          <Text
            allowFontScaling={false}
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
                  <Text key={p.n} allowFontScaling={false}>
                    <Text allowFontScaling={false} style={{ fontSize: fontSize * 0.5, color: style.accent, fontFamily: UI_FONT.bold }}>{p.n} </Text>
                    {p.text}
                    {i < parts.length - 1 ? ' ' : ''}
                  </Text>
                ))
              : body}
          </Text>
          <Animated.View style={[styles.refRow, { justifyContent: align === 'left' ? 'flex-start' : 'center' }, refStyle]}>
            <View style={[styles.rule, { backgroundColor: style.accent }]} />
            <Text style={[styles.ref, { color: style.text }]} maxFontSizeMultiplier={scale} numberOfLines={2}>
              {title}
            </Text>
            {align === 'left' ? null : <View style={[styles.rule, { backgroundColor: style.accent }]} />}
          </Animated.View>
        </Animated.View>

        <Text style={[styles.copyright, { color: style.text }]} maxFontSizeMultiplier={scale} numberOfLines={2}>
          {copyright}
        </Text>
      </View>
    </View>
  );
}

export const VerseCard = memo(VerseCardBase);

const styles = StyleSheet.create({
  inner: { flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  stamp: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, transform: [{ rotate: '-2deg' }] },
  stampText: { fontFamily: UI_FONT.title, fontSize: 11.5, letterSpacing: 0.6 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  kicker: { fontFamily: UI_FONT.bold, fontSize: 11, letterSpacing: 1.6, opacity: 0.75 },
  body: { flex: 1, justifyContent: 'center' },
  framed: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 18, paddingVertical: 24, marginVertical: 16 },
  quoteMark: { fontFamily: UI_FONT.serifBold, fontSize: 72, lineHeight: 72, marginBottom: -18, opacity: 0.5 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  rule: { width: 18, height: 1.5 },
  ref: { fontFamily: UI_FONT.display, fontSize: 15, letterSpacing: 0.4 },
  copyright: { fontFamily: UI_FONT.regular, fontSize: 10, opacity: 0.5, textAlign: 'center' },
});
