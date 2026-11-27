import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { PressableScale } from './PressableScale';
import { CATEGORY_MAP } from '../lib/categories';
import { UI_FONT } from '../lib/fonts';
import type { SearchHit } from '../lib/search';
import { useSettings } from '../lib/settings';
import { passageText, shortLabel, VERSE_MAP } from '../lib/verses';

/**
 * One search or Curhat result: the passage in the translation that matched (marked when it is
 * not the reader's own), the matched words underlined, and a quiet note on why it showed up.
 */
export const VerseResultCard = memo(function VerseResultCard({ hit, lines = 4 }: { hit: SearchHit; lines?: number }) {
  const { translation, dark, lang } = useSettings();
  const verse = VERSE_MAP[hit.id];
  if (!verse) return null;
  const c = CATEGORY_MAP[verse.categories[0]];
  const s = dark ? c.dark : c.light;
  const tr = hit.matchedIn ?? translation;
  const p = passageText(verse, tr);
  const otherTranslation = tr !== translation;
  const why =
    hit.via.words >= 0.5
      ? lang === 'id'
        ? 'Kata-katanya cocok'
        : 'Words match'
      : hit.via.meaning >= hit.via.theme
        ? lang === 'id'
          ? 'Maknanya dekat'
          : 'Close in meaning'
        : lang === 'id'
          ? `Tema ${c.label.id.toLowerCase()}`
          : `${c.label.en} theme`;

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: verse.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${p.title}. ${p.body}`}
    >
      <View style={[styles.card, { backgroundColor: s.paper }]}>
        <Text style={[styles.body, { color: s.text }]} numberOfLines={lines}>
          {highlight(p.body, hit.highlight, s.accent)}
        </Text>
        <View style={styles.meta}>
          <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={14} color={s.accent} />
          <Text style={[styles.ref, { color: s.text }]} numberOfLines={1}>
            {p.title}
          </Text>
          {otherTranslation ? (
            <View style={[styles.badge, { borderColor: s.accent }]}>
              <Text style={[styles.badgeText, { color: s.accent }]}>{shortLabel(tr)}</Text>
            </View>
          ) : null}
          <Text style={[styles.why, { color: s.text }]} numberOfLines={1}>
            {why}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
});

/** Underlines whole words that start with a highlighted word ("kasih" in "Kasih,"). */
function highlight(body: string, words: string[], color: string) {
  if (!words.length) return body;
  const esc = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(^|[^A-Za-z\u00C0-\u024F])(${esc.join('|')})(?=[^A-Za-z\u00C0-\u024F]|$)`, 'gi');
  const out: (string | React.JSX.Element)[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(body))) {
    const start = m.index + m[1].length;
    if (start > last) out.push(body.slice(last, start));
    out.push(
      <Text key={k++} style={{ textDecorationLine: 'underline', textDecorationColor: color, fontFamily: UI_FONT.serifBold }}>
        {m[2]}
      </Text>,
    );
    last = start + m[2].length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, gap: 10, overflow: 'hidden' },
  body: { fontFamily: 'Lora_400Regular', fontSize: 16, lineHeight: 25 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  ref: { fontFamily: UI_FONT.bold, fontSize: 13, flexShrink: 1 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontFamily: UI_FONT.bold, fontSize: 11, letterSpacing: 0.3 },
  why: { fontFamily: UI_FONT.regular, fontSize: 12, opacity: 0.7, marginLeft: 'auto' },
});
