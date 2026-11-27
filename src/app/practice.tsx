import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ChunkyButton } from '../components/ChunkyButton';
import { LessonHeader, QuizRunner, type QuizResult } from '../components/journey/Exercises';
import { Finish } from '../components/journey/Finish';
import { Stage } from '../components/journey/MemorizePanel';
import { UI_FONT } from '../lib/fonts';
import { useJourney } from '../lib/journey/progress';
import { arrangeQuestion, blankQuestion, exerciseFor, hash, type Question, type VerseText } from '../lib/journey/quiz';
import { poolFor, useJ, verseText } from '../lib/journey/strings';
import { DURATION, enter } from '../lib/motion';
import { useSettings } from '../lib/settings';

const SESSION = 7;

type Item = { v: VerseText; box: number };

export default function Practice() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { colors, translation } = useSettings();
  const j = useJ();
  const { cards, dueIds, reviewCard } = useJourney();

  // Freeze the session when it opens; reviewing changes the deck underneath.
  const [items] = useState<Item[]>(() => {
    const ids =
      mode === 'extra'
        ? Object.entries(cards)
            .sort((a, b) => a[1].box - b[1].box || a[1].due.localeCompare(b[1].due))
            .map(([id]) => id)
        : dueIds;
    return ids
      .slice(0, SESSION)
      .map((id) => ({ v: verseText(id, translation), box: cards[id]?.box ?? 0 }))
      .filter((x): x is Item => !!x.v);
  });
  const [questions] = useState<Question[]>(() => {
    const day = new Date().toDateString();
    return items.map(({ v, box }) => {
      const ex = exerciseFor(box);
      const seed = hash(v.id + day);
      return ex.kind === 'arrange' ? arrangeQuestion(v, seed, v.id) : blankQuestion(v, ex.count, poolFor(translation), seed, v.id);
    });
  });
  const fresh = items.filter((x) => x.box === 0);
  const [phase, setPhase] = useState<{ kind: 'read'; i: number } | { kind: 'quiz' } | { kind: 'done'; result: QuizResult }>(
    fresh.length ? { kind: 'read', i: 0 } : { kind: 'quiz' },
  );
  const [p, setP] = useState(0);
  const close = () => router.back();

  if (!items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LessonHeader progress={1} onClose={close} />
        <Text style={[styles.empty, { color: colors.muted }]}>{j('nothingDue')}</Text>
      </View>
    );
  }

  if (phase.kind === 'done') {
    const right = Object.values(phase.result.firstTry).filter(Boolean).length;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Finish
          hero={
            <View style={[styles.hero, { backgroundColor: colors.primary, borderColor: colors.ledge }]}>
              <Ionicons name="bookmark" size={56} color={colors.onPrimary} />
            </View>
          }
          title={j('sessionDone')}
          lines={[
            { icon: 'checkmark-circle', text: `${right} / ${items.length}`, tone: 'success' },
            { icon: 'calendar-outline', text: j('nextReview') },
          ]}
          button={j('next')}
          onDone={close}
        />
      </View>
    );
  }

  const readShare = fresh.length ? 0.25 : 0;
  const progress = phase.kind === 'read' ? (readShare * (phase.i + 1)) / fresh.length : readShare + (1 - readShare) * p;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LessonHeader progress={progress} onClose={close} />
      {phase.kind === 'read' ? (
        <ReadFirst
          key={phase.i}
          item={fresh[phase.i]}
          onNext={() => setPhase(phase.i + 1 < fresh.length ? { kind: 'read', i: phase.i + 1 } : { kind: 'quiz' })}
        />
      ) : (
        <QuizRunner
          questions={questions}
          onProgress={setP}
          maxRetries={1}
          onFirstAttempt={(q, ok) => reviewCard(q.key, ok)}
          onFinish={(result) => setPhase({ kind: 'done', result })}
        />
      )}
    </View>
  );
}

/** A new verse is read before it's tested. */
function ReadFirst({ item, onNext }: { item: Item; onNext: () => void }) {
  const { colors } = useSettings();
  const j = useJ();
  const insets = useSafeAreaInsets();
  const a = useSharedValue(0);
  useEffect(() => {
    a.value = withTiming(1, enter(DURATION.enter));
  }, [a]);
  const s = useAnimatedStyle(() => ({ opacity: a.value, transform: [{ translateX: (1 - a.value) * 40 }] }));
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Animated.View style={[{ gap: 16 }, s]}>
          <Text style={[styles.title, { color: colors.text }]}>{j('readFirst')}</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.verse, { color: colors.text }]}>{item.v.body}</Text>
            <Text style={[styles.ref, { color: colors.primary }]}>{item.v.title}</Text>
          </View>
          <Stage box={item.box} />
        </Animated.View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8, borderTopColor: colors.border }]}>
        <ChunkyButton label={j('ready')} onPress={onNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: UI_FONT.semibold, fontSize: 16, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  hero: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: UI_FONT.title, fontSize: 24, letterSpacing: -0.4 },
  card: { borderRadius: 22, borderWidth: 2, padding: 22, gap: 16 },
  verse: { fontFamily: UI_FONT.serifItalic, fontSize: 21, lineHeight: 33 },
  ref: { fontFamily: UI_FONT.bold, fontSize: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
