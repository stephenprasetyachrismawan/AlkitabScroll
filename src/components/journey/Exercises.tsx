// The quiz engine shared by journey lessons and memorisation practice:
// multiple choice, arrange-the-pieces and fill-the-gaps, with a feedback sheet that rises
// after each check. A missed question goes to the back of the line and comes round again.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { UI_FONT } from '../../lib/fonts';
import { arrangeCorrect, blankCorrect, type Question } from '../../lib/journey/quiz';
import { useJ } from '../../lib/journey/strings';
import { DURATION, EASE_IN_OUT, enter, timing } from '../../lib/motion';
import { useSettings } from '../../lib/settings';
import { ChunkyButton } from '../ChunkyButton';
import type { FigureMood } from './StoryFigure';

const LEDGE = 3;

export function useSoft() {
  const { dark } = useSettings();
  return {
    success: dark ? 'rgba(141,186,110,0.16)' : 'rgba(79,122,58,0.12)',
    danger: dark ? 'rgba(226,115,95,0.16)' : 'rgba(179,64,46,0.10)',
  };
}

// ---------- header ----------

/** Close button and a progress bar that fills with a short travel. */
export function LessonHeader({ progress, onClose, right }: { progress: number; onClose: () => void; right?: ReactNode }) {
  const { colors } = useSettings();
  const j = useJ();
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const p = useSharedValue(0);
  const shine = useSharedValue(0);
  const last = useRef(progress);
  useEffect(() => {
    p.value = withTiming(progress, { ...timing(DURATION.move + 120), easing: EASE_IN_OUT });
    if (progress > last.current) shine.value = withSequence(withTiming(1, timing(DURATION.quick)), withDelay(120, withTiming(0, timing(DURATION.move))));
    last.current = progress;
  }, [progress, p, shine]);
  const fill = useAnimatedStyle(() => ({ transform: [{ translateX: -w + w * p.value }] }));
  const gleam = useAnimatedStyle(() => ({ opacity: shine.value * 0.55 }));
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={j('quit')} style={styles.close}>
        <Ionicons name="close" size={28} color={colors.muted} />
      </Pressable>
      <View
        style={[styles.track, { backgroundColor: colors.surface }]}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.fill, { backgroundColor: colors.success }, fill]}>
          <Animated.View style={[styles.gleam, gleam]} />
        </Animated.View>
      </View>
      {right ?? <View style={{ width: 28 }} />}
    </View>
  );
}

// ---------- chips and tiles ----------

/** A small tactile word chip. `ghost` keeps its place in the bank once it's been used. */
function Chip({ label, onPress, ghost, tone = 'card', disabled }: { label: string; onPress?: () => void; ghost?: boolean; tone?: 'card' | 'picked'; disabled?: boolean }) {
  const { colors } = useSettings();
  const y = useSharedValue(0);
  const pop = useSharedValue(0);
  useEffect(() => {
    pop.value = withTiming(1, enter(DURATION.slide));
  }, [pop]);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const enterStyle = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: 0.92 + pop.value * 0.08 }] }));
  if (ghost) {
    return (
      <View style={[styles.chipWrap, { paddingBottom: LEDGE }]} importantForAccessibility="no-hide-descendants">
        <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.surface }]}>
          <Text style={[styles.chipText, { color: 'transparent' }]}>{label}</Text>
        </View>
      </View>
    );
  }
  return (
    <Animated.View style={enterStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPressIn={() => {
          y.set(withTiming(LEDGE, timing(DURATION.press)));
          Haptics.selectionAsync().catch(() => {});
        }}
        onPressOut={() => y.set(withTiming(0, timing(DURATION.release)))}
        onPress={onPress}
        style={[styles.chipWrap, { paddingBottom: LEDGE }]}
      >
        <View style={[styles.chipLedge, { backgroundColor: colors.border }]} />
        <Animated.View style={[styles.chip, { backgroundColor: colors.card, borderColor: tone === 'picked' ? colors.primary : colors.border }, face]}>
          <Text style={[styles.chipText, { color: colors.text }]} maxFontSizeMultiplier={1.8}>
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function Option({
  label,
  selected,
  onPress,
  index,
  serif,
  mark,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  index: number;
  serif?: boolean;
  /** after checking: the right option turns green, a wrong pick red */
  mark?: 'right' | 'wrong';
}) {
  const { colors } = useSettings();
  const soft = useSoft();
  const y = useSharedValue(0);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const edge = mark === 'right' ? colors.success : mark === 'wrong' ? colors.danger : selected ? colors.primary : colors.border;
  const wash = mark === 'right' ? soft.success : mark === 'wrong' ? soft.danger : selected ? colors.primarySoft : null;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPressIn={() => {
        y.set(withTiming(LEDGE + 1, timing(DURATION.press)));
        Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => y.set(withTiming(0, timing(DURATION.release)))}
      onPress={onPress}
      style={{ paddingBottom: LEDGE + 1 }}
    >
      <View style={[styles.optLedge, { backgroundColor: mark || selected ? edge : colors.border }]} />
      <Animated.View style={[styles.opt, { backgroundColor: colors.card, borderColor: edge }, face]}>
        {wash ? <View style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} /> : null}
        <View style={[styles.optKey, { borderColor: edge }]}>
          {mark ? (
            <Ionicons name={mark === 'right' ? 'checkmark' : 'close'} size={16} color={edge} />
          ) : (
            <Text style={[styles.optKeyText, { color: selected ? colors.primary : colors.muted }]}>{index + 1}</Text>
          )}
        </View>
        <Text style={[serif ? styles.optSerif : styles.optText, { color: colors.text }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ---------- exercise bodies ----------

type Answer = { ready: boolean; check: () => boolean; solution: string };

function ChoiceBody({ q, onAnswer, result }: { q: Extract<Question, { kind: 'story' | 'ref' }>; onAnswer: (a: Answer) => void; result: null | 'right' | 'wrong' }) {
  const { colors } = useSettings();
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => {
    onAnswer({ ready: sel !== null, check: () => sel === q.answer, solution: q.options[q.answer] });
  }, [sel, q, onAnswer]);
  return (
    <View style={{ gap: 12 }}>
      {q.kind === 'ref' ? (
        <View style={[styles.quote, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.quoteText, { color: colors.text }]}>{q.verse.body}</Text>
        </View>
      ) : null}
      {q.options.map((o, i) => (
        <Option
          key={o}
          label={o}
          index={i}
          selected={sel === i}
          onPress={() => setSel(i)}
          mark={result && i === q.answer ? 'right' : result === 'wrong' && i === sel ? 'wrong' : undefined}
        />
      ))}
    </View>
  );
}

export function ArrangeBody({ q, onAnswer }: { q: Extract<Question, { kind: 'arrange' }>; onAnswer: (a: Answer) => void }) {
  const { colors } = useSettings();
  const j = useJ();
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => {
    onAnswer({
      ready: picked.length === q.shuffled.length,
      check: () => arrangeCorrect(
        q.pieces,
        picked.map((i) => q.shuffled[i]),
      ),
      solution: q.verse.body,
    });
  }, [picked, q, onAnswer]);
  const used = new Set(picked);
  return (
    <View style={{ gap: 18 }}>
      <Text style={[styles.hint, { color: colors.muted }]}>{j('tapPieces')}</Text>
      <View style={[styles.answerArea, { borderColor: colors.border }]}>
        {picked.map((i) => (
          <Chip key={i} label={q.shuffled[i]} tone="picked" onPress={() => setPicked((p) => p.filter((x) => x !== i))} />
        ))}
      </View>
      <View style={styles.bank}>
        {q.shuffled.map((piece, i) => (
          <Chip key={i} label={piece} ghost={used.has(i)} onPress={() => setPicked((p) => [...p, i])} />
        ))}
      </View>
      <Text style={[styles.ref, { color: colors.muted }]}>{q.verse.title}</Text>
    </View>
  );
}

export function BlankBody({ q, onAnswer }: { q: Extract<Question, { kind: 'blank' }>; onAnswer: (a: Answer) => void }) {
  const { colors } = useSettings();
  const j = useJ();
  const { blank } = q;
  const [filled, setFilled] = useState<(number | null)[]>(() => blank.holes.map(() => null));
  useEffect(() => {
    onAnswer({
      ready: filled.every((f) => f !== null),
      check: () => blankCorrect(
        blank,
        filled.map((f) => (f === null ? null : blank.bank[f])),
      ),
      solution: q.verse.body,
    });
  }, [filled, blank, q, onAnswer]);
  const holeOf = new Map(blank.holes.map((h, k) => [h, k]));
  const used = new Set(filled.filter((f): f is number => f !== null));
  const nextEmpty = filled.findIndex((f) => f === null);

  return (
    <View style={{ gap: 18 }}>
      <Text style={[styles.hint, { color: colors.muted }]}>{j('tapWords')}</Text>
      <View style={[styles.quote, styles.blankText, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {blank.tokens.map((tok, i) => {
          const k = holeOf.get(i);
          if (k === undefined) {
            return (
              <Text key={i} style={[styles.word, { color: colors.text }]}>
                {tok}
              </Text>
            );
          }
          // keep punctuation around the hidden word
          const word = blank.answers[k];
          const at = tok.indexOf(word);
          const before = at > 0 ? tok.slice(0, at) : '';
          const after = at >= 0 ? tok.slice(at + word.length) : '';
          const f = filled[k];
          const active = k === nextEmpty;
          return (
            <View key={i} style={styles.slotRow}>
              {before ? <Text style={[styles.word, { color: colors.text }]}>{before}</Text> : null}
              <Pressable
                onPress={() => setFilled((arr) => arr.map((x, idx) => (idx === k ? null : x)))}
                accessibilityRole="button"
                accessibilityLabel={f === null ? '___' : blank.bank[f]}
                style={[
                  styles.slot,
                  {
                    borderBottomColor: active ? colors.primary : colors.muted,
                    backgroundColor: f !== null ? colors.primarySoft : active ? colors.surface : 'transparent',
                    minWidth: Math.max(48, word.length * 9),
                  },
                ]}
              >
                <Text style={[styles.word, { color: colors.primary, fontFamily: UI_FONT.bold }]}>{f === null ? ' ' : blank.bank[f]}</Text>
              </Pressable>
              {after ? <Text style={[styles.word, { color: colors.text }]}>{after}</Text> : null}
            </View>
          );
        })}
      </View>
      <View style={styles.bank}>
        {blank.bank.map((w, i) => (
          <Chip
            key={i}
            label={w}
            ghost={used.has(i)}
            onPress={() =>
              setFilled((arr) => {
                const at = arr.findIndex((x) => x === null);
                return at < 0 ? arr : arr.map((x, idx) => (idx === at ? i : x));
              })
            }
          />
        ))}
      </View>
      <Text style={[styles.ref, { color: colors.muted }]}>{q.verse.title}</Text>
    </View>
  );
}

// ---------- feedback ----------

function FeedbackSheet({ result, solution, onContinue, retry }: { result: 'right' | 'wrong'; solution: string; onContinue: () => void; retry: boolean }) {
  const { colors } = useSettings();
  const soft = useSoft();
  const j = useJ();
  const insets = useSafeAreaInsets();
  const p = useSharedValue(0);
  const icon = useSharedValue(0);
  const [praise] = useState(() => (['correct', 'correctAlt', 'correctAlt2'] as const)[Math.floor(Math.random() * 3)]);
  useEffect(() => {
    p.value = withTiming(1, enter(DURATION.slide + 60));
    icon.value = withDelay(80, withSequence(withTiming(1.18, timing(DURATION.quick)), withTiming(1, enter(DURATION.move))));
  }, [p, icon]);
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 240 }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: icon.value }] }));
  const right = result === 'right';
  const ink = right ? colors.success : colors.danger;
  return (
    <Animated.View
      style={[styles.sheet, { backgroundColor: colors.bg, paddingBottom: Math.max(insets.bottom, 12) + 8 }, sheet]}
      accessibilityLiveRegion="polite"
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: right ? soft.success : soft.danger }]} />
      <View style={styles.sheetRow}>
        <Animated.View style={[styles.sheetIcon, { backgroundColor: ink }, iconStyle]}>
          <Ionicons name={right ? 'checkmark' : 'close'} size={24} color={colors.bg} />
        </Animated.View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.sheetTitle, { color: ink }]}>{right ? j(praise) : j('wrong')}</Text>
          {!right ? <Text style={[styles.sheetBody, { color: colors.text }]}>{solution}</Text> : null}
          {!right && retry ? <Text style={[styles.sheetNote, { color: colors.muted }]}>{j('wrongLater')}</Text> : null}
        </View>
      </View>
      <ChunkyButton label={j('next')} onPress={onContinue} face={ink} ledge={right ? '#3A5C2A' : '#7E2C1F'} ink={colors.bg} />
    </Animated.View>
  );
}

// ---------- runner ----------

export type QuizResult = { mistakes: number; firstTry: Record<string, boolean> };

/**
 * Runs a list of questions. Reports progress (0..1) for the header, the first attempt at
 * each question (for spaced repetition), and the total when the line is empty.
 */
export function QuizRunner({
  questions,
  onProgress,
  onFirstAttempt,
  onMood,
  onFinish,
  maxRetries = 2,
}: {
  questions: Question[];
  onProgress: (p: number) => void;
  onFirstAttempt?: (q: Question, correct: boolean) => void;
  onMood?: (m: FigureMood) => void;
  onFinish: (r: QuizResult) => void;
  maxRetries?: number;
}) {
  const { colors } = useSettings();
  const j = useJ();
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<Question[]>(questions);
  const [idx, setIdx] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<null | 'right' | 'wrong'>(null);
  const [willRetry, setWillRetry] = useState(false);
  const [answer, setAnswer] = useState<Answer>({ ready: false, check: () => false, solution: '' });
  const firstTry = useRef<Record<string, boolean>>({});
  const tries = useRef<Record<string, number>>({});
  const solved = useRef(0);
  const mistakes = useRef(0);
  const shake = useSharedValue(0);
  const enterP = useSharedValue(1);

  const q = queue[idx];
  const total = questions.length;

  useEffect(() => {
    enterP.value = 0;
    enterP.value = withTiming(1, enter(DURATION.enter - 120));
    onMood?.('think');
  }, [idx, enterP, onMood]);

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: enterP.value,
    transform: [{ translateX: (1 - enterP.value) * 36 + shake.value }],
  }));

  const check = () => {
    const ok = answer.check();
    setResult(ok ? 'right' : 'wrong');
    setWillRetry(!ok && (tries.current[q.key] ?? 0) < maxRetries);
    onMood?.(ok ? 'cheer' : 'sad');
    if (!(q.key in firstTry.current)) {
      firstTry.current[q.key] = ok;
      onFirstAttempt?.(q, ok);
    }
    if (ok) {
      solved.current += 1;
      onProgress(solved.current / total);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      mistakes.current += 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      shake.set(withSequence(withTiming(-8, timing(60)), withTiming(8, timing(70)), withTiming(-5, timing(70)), withTiming(0, timing(80))));
    }
  };

  const next = () => {
    let nextQueue = queue;
    if (result === 'wrong') {
      const n = (tries.current[q.key] ?? 0) + 1;
      tries.current[q.key] = n;
      if (n <= maxRetries) nextQueue = [...queue, q];
      else {
        // gave it enough goes: count it so the bar still reaches the end
        solved.current += 1;
        onProgress(solved.current / total);
      }
    }
    setResult(null);
    if (idx + 1 >= nextQueue.length) {
      onFinish({ mistakes: mistakes.current, firstTry: firstTry.current });
      return;
    }
    setQueue(nextQueue);
    setIdx(idx + 1);
    setAttempt((a) => a + 1);
  };

  if (!q) return null;
  const title = q.kind === 'story' ? j('qStory') : q.kind === 'ref' ? j('qRef') : q.kind === 'arrange' ? j('qArrange') : j('qBlank');
  const bodyKey = `${q.key}#${attempt}`;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Animated.View style={bodyStyle}>
          <Text style={[styles.qTitle, { color: colors.text }]} accessibilityRole="header">
            {title}
          </Text>
          {q.kind === 'story' ? <Text style={[styles.qPrompt, { color: colors.text }]}>{q.prompt}</Text> : null}
          <View pointerEvents={result ? 'none' : 'auto'} style={{ marginTop: 16 }}>
            {q.kind === 'story' || q.kind === 'ref' ? (
              <ChoiceBody key={bodyKey} q={q} onAnswer={setAnswer} result={result} />
            ) : q.kind === 'arrange' ? (
              <ArrangeBody key={bodyKey} q={q} onAnswer={setAnswer} />
            ) : (
              <BlankBody key={bodyKey} q={q} onAnswer={setAnswer} />
            )}
          </View>
        </Animated.View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8, borderTopColor: colors.border }]}>
        <ChunkyButton label={j('check')} onPress={check} disabled={!answer.ready || !!result} />
      </View>
      {result ? <FeedbackSheet key={bodyKey} result={result} solution={answer.solution} retry={willRetry} onContinue={next} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 10 },
  close: { width: 28, alignItems: 'center' },
  track: { flex: 1, height: 16, borderRadius: 8, overflow: 'hidden' },
  fill: { borderRadius: 8 },
  gleam: { position: 'absolute', left: 8, right: 8, top: 3, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  body: { padding: 20, paddingBottom: 40 },
  qTitle: { fontFamily: UI_FONT.title, fontSize: 24, letterSpacing: -0.4 },
  qPrompt: { fontFamily: UI_FONT.semibold, fontSize: 18, lineHeight: 26, marginTop: 10 },
  hint: { fontFamily: UI_FONT.semibold, fontSize: 14 },
  ref: { fontFamily: UI_FONT.bold, fontSize: 13, letterSpacing: 0.3 },
  quote: { borderRadius: 18, borderWidth: 2, padding: 16 },
  quoteText: { fontFamily: UI_FONT.serifItalic, fontSize: 18, lineHeight: 28 },
  blankText: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 6, rowGap: 6 },
  word: { fontFamily: UI_FONT.serif, fontSize: 18, lineHeight: 28 },
  slotRow: { flexDirection: 'row', alignItems: 'flex-end' },
  slot: { borderBottomWidth: 2.5, borderRadius: 6, paddingHorizontal: 6, alignItems: 'center' },
  answerArea: {
    minHeight: 120,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    paddingVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'flex-start',
  },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chipWrap: {},
  chipLedge: { position: 'absolute', left: 0, right: 0, bottom: 0, top: LEDGE, borderRadius: 12 },
  chip: { borderRadius: 12, borderWidth: 2, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontFamily: UI_FONT.semibold, fontSize: 16 },
  optLedge: { position: 'absolute', left: 0, right: 0, bottom: 0, top: LEDGE + 1, borderRadius: 16 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 2, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 14 },
  optKey: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  optKeyText: { fontFamily: UI_FONT.bold, fontSize: 13 },
  optText: { flex: 1, fontFamily: UI_FONT.semibold, fontSize: 16, lineHeight: 22 },
  optSerif: { flex: 1, fontFamily: UI_FONT.serif, fontSize: 16, lineHeight: 24 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 18, gap: 16, overflow: 'hidden' },
  sheetRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  sheetIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: UI_FONT.title, fontSize: 21 },
  sheetBody: { fontFamily: UI_FONT.serif, fontSize: 15, lineHeight: 22 },
  sheetNote: { fontFamily: UI_FONT.semibold, fontSize: 13 },
});
