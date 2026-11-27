// Hook point for animated characters on the journey.
// Today each figure is a simple medallion that bobs, hops or droops with the moment. The
// character work can replace it app-wide without touching the journey screens:
//
//   import { setFigureRenderer } from '../components/journey/StoryFigure';
//   setFigureRenderer(({ figure, mood, size }) => <AnimatedCharacter id={figure} mood={mood} size={size} />);
//
// Return null from the renderer to fall back to the medallion for a figure that has no art yet.
import { useEffect, type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { UI_FONT } from '../../lib/fonts';
import type { FigureId } from '../../lib/journey/path';
import { EASE_IN_OUT, enter, timing } from '../../lib/motion';
import { useSettings } from '../../lib/settings';

/** idle: on the path. cheer: a right answer or a finished story. think: a question. sad: a miss. */
export type FigureMood = 'idle' | 'cheer' | 'think' | 'sad';

export type FigureProps = { figure: FigureId; mood: FigureMood; size: number };
type Renderer = (p: FigureProps) => ReactElement | null;

let renderer: Renderer | null = null;
export function setFigureRenderer(r: Renderer | null) {
  renderer = r;
}

const LOOK: Record<FigureId, { icon: keyof typeof Ionicons.glyphMap; name: { id: string; en: string }; tint: string }> = {
  abraham: { icon: 'star-outline', name: { id: 'Abraham', en: 'Abraham' }, tint: '#B07A3E' },
  joseph: { icon: 'shirt-outline', name: { id: 'Yusuf', en: 'Joseph' }, tint: '#A0603A' },
  moses: { icon: 'flame-outline', name: { id: 'Musa', en: 'Moses' }, tint: '#B5562F' },
  joshua: { icon: 'flag-outline', name: { id: 'Yosua', en: 'Joshua' }, tint: '#7A6A2E' },
  david: { icon: 'musical-notes-outline', name: { id: 'Daud', en: 'David' }, tint: '#5E7A3A' },
  isaiah: { icon: 'sparkles-outline', name: { id: 'Yesaya', en: 'Isaiah' }, tint: '#3E6E7A' },
  jeremiah: { icon: 'color-palette-outline', name: { id: 'Yeremia', en: 'Jeremiah' }, tint: '#6E5A3E' },
  jesus: { icon: 'sunny-outline', name: { id: 'Yesus', en: 'Jesus' }, tint: '#9A6A3A' },
  peter: { icon: 'boat-outline', name: { id: 'Petrus', en: 'Peter' }, tint: '#3E5E7A' },
  paul: { icon: 'mail-open-outline', name: { id: 'Paulus', en: 'Paul' }, tint: '#7A4A3E' },
};

export const figureName = (f: FigureId, lang: 'id' | 'en') => LOOK[f].name[lang];

export function StoryFigure({ figure, mood = 'idle', size = 72, label }: { figure: FigureId; mood?: FigureMood; size?: number; label?: boolean }) {
  const custom = renderer?.({ figure, mood, size }) ?? null;
  return custom ?? <Medallion figure={figure} mood={mood} size={size} label={label} />;
}

function Medallion({ figure, mood, size, label }: { figure: FigureId; mood: FigureMood; size: number; label?: boolean }) {
  const { colors, lang, dark } = useSettings();
  const look = LOOK[figure];
  const y = useSharedValue(0);
  const r = useSharedValue(0);
  const s = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(y);
    cancelAnimation(r);
    if (mood === 'idle') {
      y.value = withRepeat(withSequence(withTiming(-4, timing(1400, EASE_IN_OUT)), withTiming(0, timing(1400, EASE_IN_OUT))), -1);
      r.value = withTiming(0, timing(300));
    } else if (mood === 'cheer') {
      y.value = withSequence(withTiming(-14, timing(180)), withTiming(0, enter(320)), withTiming(-7, timing(150)), withTiming(0, enter(260)));
      s.value = withSequence(withTiming(1.08, timing(180)), withTiming(1, enter(420)));
      r.value = withTiming(0, timing(200));
    } else if (mood === 'think') {
      y.value = withTiming(0, timing(200));
      r.value = withRepeat(withSequence(withTiming(-5, timing(900, EASE_IN_OUT)), withTiming(5, timing(900, EASE_IN_OUT))), -1, true);
    } else {
      y.value = withTiming(3, enter(400));
      r.value = withSequence(withTiming(-6, timing(120)), withTiming(6, timing(120)), withTiming(0, enter(260)));
    }
  }, [mood, y, r, s]);

  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: `${r.value}deg` }, { scale: s.value }] }));
  const ring = dark ? 'rgba(247,241,227,0.10)' : 'rgba(34,29,23,0.08)';

  return (
    <View style={{ alignItems: 'center' }} accessible accessibilityLabel={look.name[lang]}>
      <Animated.View
        style={[
          styles.disc,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.card, borderColor: look.tint, borderWidth: Math.max(2, size / 24) },
          a,
        ]}
      >
        <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: size / 10, borderColor: ring }]} />
        <Ionicons name={look.icon} size={size * 0.46} color={look.tint} />
      </Animated.View>
      {label ? (
        <Text style={[styles.name, { color: colors.muted }]} numberOfLines={1}>
          {look.name[lang]}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontFamily: UI_FONT.bold, fontSize: 12, marginTop: 6, letterSpacing: 0.3 },
});
