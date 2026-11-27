import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ChunkyButton } from '../../components/ChunkyButton';
import { LessonHeader, QuizRunner, type QuizResult } from '../../components/journey/Exercises';
import { Finish } from '../../components/journey/Finish';
import { StoryFigure, figureName, type FigureMood } from '../../components/journey/StoryFigure';
import { UI_FONT } from '../../lib/fonts';
import { NODE_MAP } from '../../lib/journey/path';
import { useJourney } from '../../lib/journey/progress';
import { buildLesson } from '../../lib/journey/quiz';
import { poolFor, useJ, verseText } from '../../lib/journey/strings';
import { DURATION, enter } from '../../lib/motion';
import { useSettings } from '../../lib/settings';

type Phase = { kind: 'intro' } | { kind: 'read'; i: number } | { kind: 'quiz' } | { kind: 'done'; result: QuizResult; added: number };

// intro + 5 readings make up the first third of the bar, the quiz the rest
const READ_SHARE = 0.34;

export default function Lesson() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const node = NODE_MAP[id ?? ''];
  const { colors, lang, translation } = useSettings();
  const j = useJ();
  const { completeNode } = useJourney();
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [quizP, setQuizP] = useState(0);
  const [mood, setMood] = useState<FigureMood>('idle');

  const verses = useMemo(() => (node ? node.verseIds.map((v) => verseText(v, translation)).filter((v) => !!v) : []), [node, translation]);
  const questions = useMemo(() => (node ? buildLesson(node, lang, verses, poolFor(translation)) : []), [node, lang, verses, translation]);

  const finish = useCallback(
    (result: QuizResult) => {
      if (!node) return;
      const { added } = completeNode(node.id, result.mistakes);
      setPhase({ kind: 'done', result, added });
    },
    [node, completeNode],
  );

  if (!node) return null;
  const close = () => router.back();

  const steps = 1 + verses.length;
  const progress =
    phase.kind === 'intro' ? 0 : phase.kind === 'read' ? (READ_SHARE * (phase.i + 1)) / steps : phase.kind === 'quiz' ? READ_SHARE + (1 - READ_SHARE) * quizP : 1;

  if (phase.kind === 'done') {
    const m = phase.result.mistakes;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Finish
          hero={<StoryFigure figure={node.figure} mood="cheer" size={120} />}
          title={j('lessonDone')}
          lines={[
            m === 0 ? { icon: 'star', text: j('perfect'), tone: 'success' } : { icon: 'checkmark-done', text: `${m} ${j('mistakes')}` },
            ...(phase.added ? [{ icon: 'bookmark' as const, text: `${phase.added} ${j('addedToDeck')}`, tone: 'primary' as const }] : []),
          ]}
          button={j('backToPath')}
          onDone={close}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LessonHeader progress={progress} onClose={close} right={phase.kind === 'quiz' ? <StoryFigure figure={node.figure} mood={mood} size={36} /> : undefined} />
      {phase.kind === 'intro' ? (
        <Step key="intro" footer={<ChunkyButton label={j('next')} onPress={() => setPhase({ kind: 'read', i: 0 })} />}>
          <View style={styles.figureRow}>
            <StoryFigure figure={node.figure} mood="idle" size={96} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: colors.primary }]}>{figureName(node.figure, lang).toUpperCase()}</Text>
              <Text style={[styles.h1, { color: colors.text }]} accessibilityRole="header">
                {node.title[lang]}
              </Text>
              <Text style={[styles.source, { color: colors.muted }]}>
                {j('readFull')}: {node.source[lang]}
              </Text>
            </View>
          </View>
          <Text style={[styles.story, { color: colors.text }]}>{node.intro[lang]}</Text>
          <Text style={[styles.hint, { color: colors.muted }]}>{j('fiveVerses')}</Text>
        </Step>
      ) : phase.kind === 'read' ? (
        <Step
          key={`read-${phase.i}`}
          slide
          footer={
            <ChunkyButton
              label={phase.i + 1 < verses.length ? j('next') : j('toQuiz')}
              icon={phase.i + 1 < verses.length ? undefined : 'help-circle'}
              onPress={() => setPhase(phase.i + 1 < verses.length ? { kind: 'read', i: phase.i + 1 } : { kind: 'quiz' })}
            />
          }
        >
          <Text style={[styles.counter, { color: colors.muted }]}>
            {phase.i + 1} / {verses.length}
          </Text>
          <View style={[styles.verseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.verse, { color: colors.text }]}>{verses[phase.i]?.body}</Text>
            <Text style={[styles.verseRef, { color: colors.primary }]}>{verses[phase.i]?.title}</Text>
          </View>
          <View style={styles.dots}>
            {verses.map((_, k) => (
              <View key={k} style={[styles.dot, { backgroundColor: k <= phase.i ? colors.primary : colors.surface, width: k === phase.i ? 22 : 8 }]} />
            ))}
          </View>
        </Step>
      ) : (
        <View style={{ flex: 1 }}>
          <QuizRunner questions={questions} onProgress={setQuizP} onMood={setMood} onFinish={finish} />
        </View>
      )}
    </View>
  );
}

/** One screen of the lesson: content scrolls, the button stays put. Slides in from the right. */
function Step({ children, footer, slide }: { children: React.ReactNode; footer: React.ReactNode; slide?: boolean }) {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, enter(DURATION.enter - 80));
  }, [p]);
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [slide ? { translateX: (1 - p.value) * 40 } : { translateY: (1 - p.value) * 18 }] }));
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.stepBody}>
        <Animated.View style={[{ gap: 18 }, a]}>{children}</Animated.View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8, borderTopColor: colors.border }]}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepBody: { padding: 20, paddingBottom: 40 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  figureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  kicker: { fontFamily: UI_FONT.bold, fontSize: 12, letterSpacing: 1.2 },
  h1: { fontFamily: UI_FONT.title, fontSize: 28, letterSpacing: -0.6, lineHeight: 32 },
  source: { fontFamily: UI_FONT.semibold, fontSize: 13, marginTop: 4 },
  story: { fontFamily: UI_FONT.serif, fontSize: 18, lineHeight: 29 },
  hint: { fontFamily: UI_FONT.bold, fontSize: 13, letterSpacing: 0.3 },
  counter: { fontFamily: UI_FONT.bold, fontSize: 13, letterSpacing: 0.5 },
  verseCard: { borderRadius: 22, borderWidth: 2, padding: 22, gap: 16 },
  verse: { fontFamily: UI_FONT.serifItalic, fontSize: 21, lineHeight: 33 },
  verseRef: { fontFamily: UI_FONT.bold, fontSize: 14, letterSpacing: 0.3 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { height: 8, borderRadius: 4 },
});
