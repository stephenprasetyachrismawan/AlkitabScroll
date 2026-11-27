import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { todayKey } from '../../lib/algorithm';
import { UI_FONT } from '../../lib/fonts';
import { useJourney } from '../../lib/journey/progress';
import { isDue, MASTERED_BOX, type Card } from '../../lib/journey/quiz';
import { useJ, verseText } from '../../lib/journey/strings';
import { useSettings } from '../../lib/settings';
import { ChunkyButton } from '../ChunkyButton';
import { FadeInView } from '../FadeInView';
import { PressableScale } from '../PressableScale';
import { RollingNumber } from '../RollingNumber';
import { Surface } from '../Surface';
import { useTabBarSpace } from '../TabBar';

/** The memorisation deck: what's due, what's learned, and a way to practise. */
export function MemorizePanel() {
  const { colors, translation } = useSettings();
  const j = useJ();
  const tabSpace = useTabBarSpace();
  const { cards, dueIds, masteredCount, removeCard } = useJourney();
  const today = todayKey();

  const list = useMemo(
    () =>
      Object.entries(cards)
        .map(([id, c]) => ({ id, c, v: verseText(id, translation) }))
        .filter((x): x is { id: string; c: Card; v: NonNullable<ReturnType<typeof verseText>> } => !!x.v)
        .sort((a, b) => Number(isDue(b.c, today)) - Number(isDue(a.c, today)) || a.c.box - b.c.box || b.c.added.localeCompare(a.c.added)),
    [cards, translation, today],
  );

  const header = (
    <View style={{ gap: 14, marginBottom: 6 }}>
      <Text style={[styles.sub, { color: colors.muted }]}>{j('memSub')}</Text>
      <View style={styles.stats}>
        <Stat icon="albums-outline" value={list.length} label={j('inDeck')} />
        <Stat icon="time-outline" value={dueIds.length} label={j('due')} accent />
        <Stat icon="ribbon-outline" value={masteredCount} label={j('mastered')} />
      </View>
      {list.length ? (
        <ChunkyButton
          label={dueIds.length ? `${j('practice')} · ${Math.min(dueIds.length, 7)}` : j('practiceAnyway')}
          icon={dueIds.length ? 'flash' : 'repeat'}
          variant={dueIds.length ? 'primary' : 'secondary'}
          onPress={() => router.push({ pathname: '/practice', params: { mode: dueIds.length ? 'due' : 'extra' } })}
        />
      ) : null}
      {list.length && !dueIds.length ? <Text style={[styles.caught, { color: colors.success }]}>{j('nothingDue')}</Text> : null}
      <ChunkyButton label={j('addVerse')} icon="add" variant="secondary" onPress={() => router.push('/memorize-add')} />
    </View>
  );

  return (
    <FlatList
      data={list}
      keyExtractor={(x) => x.id}
      ListHeaderComponent={header}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: tabSpace + 24 }}
      ListEmptyComponent={
        <Surface style={styles.empty}>
          <Ionicons name="leaf-outline" size={28} color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>{j('emptyDeck')}</Text>
        </Surface>
      }
      renderItem={({ item, index }) => {
        const due = isDue(item.c, today);
        return (
          <FadeInView delay={Math.min(index, 8) * 40}>
            <Surface style={styles.row}>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.rowTop}>
                  <Text style={[styles.title, { color: colors.text }]}>{item.v.title}</Text>
                  {due ? (
                    <View style={[styles.duePill, { backgroundColor: colors.primarySoft }]}>
                      <Text style={[styles.dueText, { color: colors.primary }]}>{j('due')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.body, { color: colors.muted }]} numberOfLines={2}>
                  {item.v.body}
                </Text>
                <Stage box={item.c.box} />
              </View>
              <PressableScale onPress={() => removeCard(item.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${j('remove')} ${item.v.title}`}>
                <Ionicons name="trash-outline" size={18} color={colors.muted} />
              </PressableScale>
            </Surface>
          </FadeInView>
        );
      }}
    />
  );
}

function Stat({ icon, value, label, accent }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string; accent?: boolean }) {
  const { colors } = useSettings();
  return (
    <Surface style={styles.stat}>
      <Ionicons name={icon} size={18} color={accent ? colors.primary : colors.muted} />
      <RollingNumber value={value} style={[styles.statNum, { color: colors.text }]} />
      <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={2}>
        {label}
      </Text>
    </Surface>
  );
}

/** Five pips: how far a verse has come, from new to known by heart. */
export function Stage({ box }: { box: number }) {
  const { colors } = useSettings();
  const j = useJ();
  return (
    <View style={styles.stage} accessible accessibilityLabel={`${j('level')} ${Math.min(box, MASTERED_BOX)}/${MASTERED_BOX}`}>
      {Array.from({ length: MASTERED_BOX }, (_, i) => (
        <View key={i} style={[styles.pip, { backgroundColor: i < box ? (box >= MASTERED_BOX ? colors.success : colors.primary) : colors.surface }]} />
      ))}
      {box >= MASTERED_BOX ? <Ionicons name="ribbon" size={14} color={colors.success} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: UI_FONT.serifItalic, fontSize: 15, lineHeight: 22 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 12, gap: 2 },
  statNum: { fontFamily: UI_FONT.title, fontSize: 26 },
  statLabel: { fontFamily: UI_FONT.semibold, fontSize: 12 },
  caught: { fontFamily: UI_FONT.bold, fontSize: 13, textAlign: 'center' },
  empty: { padding: 20, alignItems: 'center', gap: 10, marginTop: 8 },
  emptyText: { fontFamily: UI_FONT.regular, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontFamily: UI_FONT.bold, fontSize: 15 },
  body: { fontFamily: UI_FONT.serif, fontSize: 14, lineHeight: 21 },
  duePill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  dueText: { fontFamily: UI_FONT.bold, fontSize: 11 },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pip: { width: 18, height: 6, borderRadius: 3 },
});
