import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChunkyButton } from '../../components/ChunkyButton';
import { PressableScale } from '../../components/PressableScale';
import { RollingNumber } from '../../components/RollingNumber';
import { Surface } from '../../components/Surface';
import { useTabBarSpace } from '../../components/TabBar';
import { MemorizePanel } from '../../components/journey/MemorizePanel';
import { StoryFigure } from '../../components/journey/StoryFigure';
import { UI_FONT } from '../../lib/fonts';
import { CHAPTERS, NODES, type JourneyNode } from '../../lib/journey/path';
import { useJourney } from '../../lib/journey/progress';
import { useJ } from '../../lib/journey/strings';
import { DURATION, EASE_IN_OUT, enter, timing } from '../../lib/motion';
import { useSettings } from '../../lib/settings';

const NODE = 74;
const ROW = 104;
/** horizontal swing of the path, as a share of the available half-width */
const SWING = [0, 0.42, 0.62, 0.42, 0, -0.42, -0.62, -0.42];

type Tab = 'path' | 'memorize';

/** index of each chapter's first stop across the whole path */
const CHAPTER_START = CHAPTERS.map((_, ci) => CHAPTERS.slice(0, ci).reduce((n, c) => n + c.nodes.length, 0));

export default function Journey() {
  const { colors } = useSettings();
  const j = useJ();
  const insets = useSafeAreaInsets();
  const { current, dueIds } = useJourney();
  const [tab, setTab] = useState<Tab>('path');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {j('journeyTitle')}
          </Text>
          <Surface radius={18} style={styles.count}>
            <Ionicons name="map" size={15} color={colors.primary} />
            <RollingNumber value={Math.min(current, NODES.length)} style={[styles.countText, { color: colors.text }]} />
            <Text style={[styles.countText, { color: colors.muted }]}>/{NODES.length}</Text>
          </Surface>
        </View>
        <Segments tab={tab} onChange={setTab} due={dueIds.length} />
      </View>
      {tab === 'path' ? <PathMap /> : <MemorizePanel />}
    </View>
  );
}

function Segments({ tab, onChange, due }: { tab: Tab; onChange: (t: Tab) => void; due: number }) {
  const { colors } = useSettings();
  const j = useJ();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withTiming(tab === 'path' ? 0 : w / 2, { ...timing(DURATION.slide), easing: EASE_IN_OUT });
  }, [tab, w, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={[styles.seg, { backgroundColor: colors.surface }]} onLayout={(e) => setW(e.nativeEvent.layout.width - 8)} accessibilityRole="tablist">
      {w > 0 ? <Animated.View style={[styles.segPill, { width: w / 2, backgroundColor: colors.card, borderColor: colors.border }, pill]} /> : null}
      {(['path', 'memorize'] as const).map((k) => (
        <PressableScale
          key={k}
          scaleTo={0.97}
          style={styles.segBtn}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === k }}
          onPress={() => {
            if (tab !== k) Haptics.selectionAsync().catch(() => {});
            onChange(k);
          }}
        >
          <Ionicons name={k === 'path' ? 'trail-sign-outline' : 'bookmark-outline'} size={16} color={tab === k ? colors.text : colors.muted} />
          <Text style={[styles.segText, { color: tab === k ? colors.text : colors.muted }]} numberOfLines={1}>
            {k === 'path' ? j('path') : j('memorize')}
          </Text>
          {k === 'memorize' && due > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.onPrimary }]}>{due > 99 ? '99+' : due}</Text>
            </View>
          ) : null}
        </PressableScale>
      ))}
    </View>
  );
}

// ---------- the path ----------

function PathMap() {
  const { colors, lang } = useSettings();
  const j = useJ();
  const { width } = useWindowDimensions();
  const tabSpace = useTabBarSpace();
  const { current, done } = useJourney();
  const [selected, setSelected] = useState<string | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const scrolled = useRef(false);
  // y of the current stop = chapter top + column top inside it + row top inside the column
  const pos = useRef({ chapter: 0, column: 0, row: -1 });
  const scrollToCurrent = () => {
    const { chapter, column, row } = pos.current;
    if (scrolled.current || row < 0) return;
    const y = chapter + column + row;
    scrolled.current = true;
    if (y > 320) scroll.current?.scrollTo({ y: y - 240, animated: false });
  };
  const half = Math.min(width, 520) / 2 - NODE / 2 - 20;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: tabSpace + 140, alignItems: 'center' }}
        onContentSizeChange={scrollToCurrent}
      >
        <Text style={[styles.sub, { color: colors.muted }]}>{j('journeySub')}</Text>
        {CHAPTERS.map((ch, ci) => {
          const startK = CHAPTER_START[ci];
          const k = startK + ch.nodes.length;
          const chapterDone = ch.nodes.every((n) => done[n.id]);
          const hasCurrent = current >= startK && current < k;
          return (
            <View key={ch.id} style={styles.chapter} onLayout={hasCurrent ? (e) => (pos.current.chapter = e.nativeEvent.layout.y) : undefined}>
              <View style={[styles.banner, { backgroundColor: chapterDone ? colors.primary : colors.card, borderColor: chapterDone ? colors.primary : colors.border }]}>
                <Text style={[styles.bannerKicker, { color: chapterDone ? colors.onPrimary : colors.primary }]}>
                  {lang === 'id' ? 'BAGIAN' : 'PART'} {ci + 1}
                </Text>
                <Text style={[styles.bannerTitle, { color: chapterDone ? colors.onPrimary : colors.text }]}>{ch.title[lang]}</Text>
                <Text style={[styles.bannerSub, { color: chapterDone ? colors.onPrimary : colors.muted }]}>{ch.subtitle[lang]}</Text>
              </View>
              <View style={{ width: '100%', maxWidth: 520 }} onLayout={hasCurrent ? (e) => (pos.current.column = e.nativeEvent.layout.y) : undefined}>
                {ch.nodes.map((n, ni) => {
                  const i = startK + ni;
                  const x = SWING[i % SWING.length] * half;
                  const nextX = SWING[(i + 1) % SWING.length] * half;
                  const state: NodeState = done[n.id] ? 'done' : i === current ? 'current' : i < current ? 'done' : 'locked';
                  const figureSide = SWING[i % SWING.length] >= 0 ? -1 : 1;
                  const showFigure = ni === 1;
                  return (
                    <View
                      key={n.id}
                      style={{ height: ROW, alignItems: 'center' }}
                      onLayout={
                        state === 'current'
                          ? (e) => {
                              pos.current.row = e.nativeEvent.layout.y;
                              // parents report their layout after children: wait a frame
                              requestAnimationFrame(scrollToCurrent);
                            }
                          : undefined
                      }
                    >
                      {ni < ch.nodes.length - 1 ? <Trail from={x} to={nextX} lit={i < current} /> : null}
                      {showFigure ? (
                        <View pointerEvents="none" style={[styles.figure, { transform: [{ translateX: x + figureSide * (NODE + 34) }] }]}>
                          <StoryFigure figure={n.figure} mood={state === 'current' ? 'think' : 'idle'} size={58} label />
                        </View>
                      ) : null}
                      <View style={{ transform: [{ translateX: x }] }}>
                        <PathNode
                          node={n}
                          state={state}
                          selected={selected === n.id}
                          onPress={() => setSelected((s) => (s === n.id ? null : n.id))}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
        {current >= NODES.length ? (
          <Surface style={styles.end}>
            <Ionicons name="trophy" size={28} color={colors.primary} />
            <Text style={[styles.endText, { color: colors.text }]}>{j('journeyEnd')}</Text>
          </Surface>
        ) : null}
      </ScrollView>
      {selected ? <NodeCard key={selected} nodeId={selected} onClose={() => setSelected(null)} /> : null}
    </View>
  );
}

/** Dotted footsteps from one stop to the next. */
function Trail({ from, to, lit }: { from: number; to: number; lit: boolean }) {
  const { colors } = useSettings();
  const DOTS = 4;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: DOTS }, (_, d) => {
        // from just under this stop to just above the next one
        const t = (d + 1) / (DOTS + 1);
        const x = from + (to - from) * (0.15 + 0.7 * t);
        const y0 = NODE + 10;
        const y1 = ROW - 6;
        const y = y0 + (y1 - y0) * t;
        return (
          <View
            key={d}
            style={[
              styles.dot,
              { backgroundColor: lit ? colors.primary : colors.border, transform: [{ translateX: x }], top: y - 4, opacity: lit ? 0.8 : 1 },
            ]}
          />
        );
      })}
    </View>
  );
}

type NodeState = 'done' | 'current' | 'locked';

function PathNode({ node, state, selected, onPress }: { node: JourneyNode; state: NodeState; selected: boolean; onPress: () => void }) {
  const { colors, lang } = useSettings();
  const j = useJ();
  const y = useSharedValue(0);
  const ring = useSharedValue(0);
  const bob = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (state === 'current') {
      ring.value = withRepeat(withSequence(withTiming(1, timing(1100, EASE_IN_OUT)), withTiming(0, timing(1100, EASE_IN_OUT))), -1);
      bob.value = withRepeat(withSequence(withTiming(-5, timing(900, EASE_IN_OUT)), withTiming(0, timing(900, EASE_IN_OUT))), -1);
    } else {
      cancelAnimation(ring);
      cancelAnimation(bob);
      ring.value = 0;
      bob.value = 0;
    }
  }, [state, ring, bob]);

  const face = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const wrap = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.25 + ring.value * 0.35, transform: [{ scale: 1.12 + ring.value * 0.08 }] }));
  const bubble = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  const locked = state === 'locked';
  const faceColor = locked ? colors.surface : colors.primary;
  const ledge = locked ? colors.border : colors.ledge;
  const ink = locked ? colors.muted : colors.onPrimary;
  const icon = (state === 'done' ? 'checkmark' : locked ? 'lock-closed' : node.icon) as keyof typeof Ionicons.glyphMap;

  return (
    <Animated.View style={[{ alignItems: 'center' }, wrap]}>
      {state === 'current' ? (
        <Animated.View pointerEvents="none" style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border }, bubble]}>
          <Text style={[styles.bubbleText, { color: colors.primary }]}>{j('start').toUpperCase()}</Text>
          <View style={[styles.bubbleTip, { backgroundColor: colors.card, borderColor: colors.border }]} />
        </Animated.View>
      ) : null}
      {state === 'current' ? <Animated.View pointerEvents="none" style={[styles.halo, { borderColor: colors.primary }, halo]} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${node.title[lang]}${locked ? `. ${j('locked')}` : ''}`}
        accessibilityState={{ disabled: locked, selected }}
        onPressIn={() => {
          y.set(withTiming(5, timing(DURATION.press)));
          Haptics.impactAsync(locked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }}
        onPressOut={() => y.set(withTiming(0, timing(DURATION.release)))}
        onPress={() => {
          if (locked) shake.set(withSequence(withTiming(-6, timing(60)), withTiming(6, timing(70)), withTiming(-3, timing(70)), withTiming(0, timing(80))));
          onPress();
        }}
        style={{ width: NODE, height: NODE + 6 }}
      >
        <View style={[styles.nodeLedge, { backgroundColor: ledge }]} />
        <Animated.View style={[styles.nodeFace, { backgroundColor: faceColor, borderColor: selected ? colors.text : faceColor }, face]}>
          <View style={[styles.nodeShine, { backgroundColor: locked ? 'transparent' : 'rgba(255,255,255,0.18)' }]} />
          <Ionicons name={icon} size={30} color={ink} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** The card that rises when a stop is tapped: what the story is and a way in. */
function NodeCard({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { colors, lang } = useSettings();
  const j = useJ();
  const tabSpace = useTabBarSpace();
  const { isUnlocked, done } = useJourney();
  const i = NODES.findIndex((n) => n.id === nodeId);
  const node = NODES[i];
  const open = isUnlocked(nodeId);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, enter(DURATION.slide + 80));
  }, [p]);
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 40 }] }));
  if (!node) return null;
  return (
    <Animated.View style={[styles.card, { bottom: tabSpace + 12, backgroundColor: open ? colors.primary : colors.card, borderColor: open ? colors.ledge : colors.border }, a]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardKicker, { color: open ? colors.onPrimary : colors.muted }]}>
            {j('stopOf')} {i + 1} · {node.source[lang]}
          </Text>
          <Text style={[styles.cardTitle, { color: open ? colors.onPrimary : colors.text }]}>{node.title[lang]}</Text>
        </View>
        <PressableScale onPress={onClose} hitSlop={10} accessibilityLabel={j('quit')}>
          <Ionicons name="close" size={22} color={open ? colors.onPrimary : colors.muted} />
        </PressableScale>
      </View>
      {open ? (
        <ChunkyButton
          label={done[nodeId] ? j('again') : j('start')}
          icon={done[nodeId] ? 'refresh' : 'play'}
          face={colors.card}
          ledge={colors.ledge}
          ink={colors.primary}
          onPress={() => {
            onClose();
            router.push({ pathname: '/lesson/[id]', params: { id: nodeId } });
          }}
        />
      ) : (
        <Text style={[styles.cardLocked, { color: colors.muted }]}>{j('locked')}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, fontFamily: UI_FONT.title, fontSize: 27, letterSpacing: -0.6 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 12, minHeight: 36 },
  countText: { fontFamily: UI_FONT.bold, fontSize: 14 },
  seg: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  segPill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth * 2 },
  segBtn: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  segText: { fontFamily: UI_FONT.bold, fontSize: 14, flexShrink: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: UI_FONT.bold, fontSize: 11 },
  sub: { fontFamily: UI_FONT.serifItalic, fontSize: 15, lineHeight: 22, textAlign: 'center', paddingHorizontal: 32, marginBottom: 8 },
  chapter: { width: '100%', alignItems: 'center', marginTop: 18 },
  banner: { width: '90%', maxWidth: 480, borderRadius: 20, borderWidth: 2, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 50, gap: 2 },
  bannerKicker: { fontFamily: UI_FONT.bold, fontSize: 12, letterSpacing: 1.2 },
  bannerTitle: { fontFamily: UI_FONT.title, fontSize: 21, letterSpacing: -0.3 },
  bannerSub: { fontFamily: UI_FONT.serifItalic, fontSize: 14, lineHeight: 20 },
  dot: { position: 'absolute', left: '50%', marginLeft: -4, width: 8, height: 8, borderRadius: 4 },
  figure: { position: 'absolute', top: 2 },
  halo: { position: 'absolute', top: 0, width: NODE, height: NODE, borderRadius: NODE / 2, borderWidth: 4 },
  nodeLedge: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 6, borderRadius: NODE / 2 },
  nodeFace: { width: NODE, height: NODE, borderRadius: NODE / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  nodeShine: { position: 'absolute', top: 7, left: 14, right: 14, height: 14, borderRadius: 7 },
  bubble: { position: 'absolute', bottom: NODE + 16, borderRadius: 12, borderWidth: 2, paddingHorizontal: 12, paddingVertical: 6, zIndex: 2 },
  bubbleText: { fontFamily: UI_FONT.bold, fontSize: 13, letterSpacing: 1 },
  bubbleTip: { position: 'absolute', bottom: -7, alignSelf: 'center', left: '50%', marginLeft: -6, width: 12, height: 12, borderRightWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
  end: { marginTop: 24, marginHorizontal: 24, padding: 18, alignItems: 'center', gap: 8 },
  endText: { fontFamily: UI_FONT.semibold, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  card: { position: 'absolute', left: 16, right: 16, borderRadius: 22, borderWidth: 2, padding: 16, gap: 14 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardKicker: { fontFamily: UI_FONT.bold, fontSize: 12, letterSpacing: 0.4, opacity: 0.9 },
  cardTitle: { fontFamily: UI_FONT.title, fontSize: 22, letterSpacing: -0.3, marginTop: 2 },
  cardLocked: { fontFamily: UI_FONT.semibold, fontSize: 14 },
});
