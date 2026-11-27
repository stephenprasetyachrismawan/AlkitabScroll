// Drawing kit for Selah's characters: flat, paper-cut shapes made of plain
// Views (no SVG, no Lottie/Rive runtime, no image assets), animated with
// Reanimated on the UI thread. Every character is authored on a 100 × 100
// canvas and scaled by `k` = size / 100.
//
// Motion follows the app's rules: transform and opacity only, slow loops, no
// overshoot, and a still pose when the card is off screen or Reduce Motion is on.
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View, type ColorValue, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export const TAU = Math.PI * 2;

export const INK = '#2A211A';
export const CHEEK = '#EFA196';
export const MOUTH = '#8E3B33';
export const GOLD = '#E0A800';

/**
 * A 0 → 1 clock that repeats every `ms` while `playing`. Parked at 0 otherwise,
 * so every character's t = 0 frame is its resting pose.
 */
export function useLoop(playing: boolean, ms: number): SharedValue<number> {
  const t = useSharedValue(0);
  const reduced = useReducedMotion();
  const run = playing && !reduced;
  useEffect(() => {
    if (run) {
      t.value = 0;
      t.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(t);
      t.value = 0;
    }
    return () => cancelAnimation(t);
  }, [run, ms, t]);
  return t;
}

/** sin of the loop phase, optionally faster (`n` cycles per loop) or shifted. */
export function wave(t: number, n = 1, shift = 0) {
  'worklet';
  return Math.sin((t * n + shift) * TAU);
}

/** Eyelids: a quick blink near the end of each loop, open the rest of the time. */
export function blink(t: number) {
  'worklet';
  const d = Math.abs(t - 0.93);
  return d < 0.03 ? 0.15 + (d / 0.03) * 0.85 : 1;
}

type BoxProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** corner radius; defaults to fully round */
  r?: number;
  c: ColorValue;
  k: number;
  rot?: number;
  style?: ViewStyle;
};

/** One flat shape: rectangle, capsule, ellipse or circle. */
export function B({ x, y, w, h, r, c, k, rot, style }: BoxProps) {
  return (
    <View
      style={[
        {
          position: 'absolute',
          left: x * k,
          top: y * k,
          width: w * k,
          height: h * k,
          borderRadius: (r ?? Math.min(w, h) / 2) * k,
          backgroundColor: c,
        },
        rot ? { transform: [{ rotate: `${rot}deg` }] } : null,
        style,
      ]}
    />
  );
}

/** A shape with a slightly larger, darker copy behind it: reads on any card colour. */
export function Rimmed({ rim = 1.5, rc, ...p }: BoxProps & { rim?: number; rc: ColorValue }) {
  return (
    <>
      <B {...p} x={p.x - rim} y={p.y - rim} w={p.w + rim * 2} h={p.h + rim * 2} r={p.r !== undefined ? p.r + rim : undefined} c={rc} />
      <B {...p} />
    </>
  );
}

/**
 * A layer covering the whole canvas that moves as one piece, turning around
 * the pivot (`ox`, `oy`) in canvas units. Children keep canvas coordinates.
 */
export function G({ k, ox = 50, oy = 50, style, children }: { k: number; ox?: number; oy?: number; style?: object; children: ReactNode }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: [ox * k, oy * k, 0] }, style]}>
      {children}
    </Animated.View>
  );
}

/** Half a ring: `up` draws ∩ (smiling closed eyes), otherwise ∪ (a smile, sleeping eyes). */
export function Arc({ x, y, w, c, k, up, thick = 1.8 }: { x: number; y: number; w: number; c: ColorValue; k: number; up?: boolean; thick?: number }) {
  const s = w * k;
  return (
    <View style={{ position: 'absolute', left: x * k, top: y * k, width: s, height: s / 2, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          top: up ? 0 : -s / 2,
          width: s,
          height: s,
          borderRadius: s / 2,
          borderWidth: thick * k,
          borderColor: c,
        }}
      />
    </View>
  );
}

/** Bottom half of a filled circle: an open, laughing mouth. */
export function HalfDisc({ x, y, w, c, k }: { x: number; y: number; w: number; c: ColorValue; k: number }) {
  const s = w * k;
  return (
    <View style={{ position: 'absolute', left: x * k, top: y * k, width: s, height: s / 2, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: -s / 2, width: s, height: s, borderRadius: s / 2, backgroundColor: c }} />
    </View>
  );
}

/** A heart centred on (cx, cy), `s` wide. */
export function Heart({ cx, cy, s, c, k }: { cx: number; cy: number; s: number; c: ColorValue; k: number }) {
  const q = s * 0.58;
  return (
    <>
      <B x={cx - q / 2} y={cy - q * 0.35} w={q} h={q} r={1} c={c} k={k} rot={45} />
      <B x={cx - q * 0.86} y={cy - q * 0.78} w={q} h={q} c={c} k={k} />
      <B x={cx - q * 0.14} y={cy - q * 0.78} w={q} h={q} c={c} k={k} />
    </>
  );
}

/** A four-point twinkle. */
export function Sparkle({ cx, cy, s, c, k }: { cx: number; cy: number; s: number; c: ColorValue; k: number }) {
  return (
    <>
      <B x={cx - s * 0.12} y={cy - s / 2} w={s * 0.24} h={s} c={c} k={k} />
      <B x={cx - s / 2} y={cy - s * 0.12} w={s} h={s * 0.24} c={c} k={k} />
    </>
  );
}

/**
 * Something drifting up and fading (hearts, notes, Zz, embers), one of `count`
 * staggered copies. `dx` leans the path sideways.
 */
export function Floater({
  t,
  k,
  i,
  count,
  x,
  y,
  rise = 22,
  dx = 6,
  children,
}: {
  t: SharedValue<number>;
  k: number;
  i: number;
  count: number;
  x: number;
  y: number;
  rise?: number;
  dx?: number;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const p = (t.value + i / count) % 1;
    return {
      opacity: t.value === 0 ? 0 : Math.sin(p * Math.PI),
      transform: [{ translateX: (dx * p + Math.sin(p * TAU) * 2) * k }, { translateY: -rise * p * k }, { scale: 0.7 + p * 0.4 }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x * k, top: y * k }, style]}>
      {children}
    </Animated.View>
  );
}

/** A glyph for floaters (notes, z). System font so ♪ always exists. */
export function Glyph({ ch, size, c, k }: { ch: string; size: number; c: ColorValue; k: number }) {
  return (
    <Text allowFontScaling={false} style={{ fontSize: size * k, lineHeight: size * k * 1.1, color: c, fontWeight: '700' }}>
      {ch}
    </Text>
  );
}

/** Ground shadow that shrinks as the character leaves the ground. */
export function Shadow({ k, x = 28, y = 90, w = 44, lift }: { k: number; x?: number; y?: number; w?: number; lift?: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const l = lift ? lift.value : 0;
    return { opacity: 1 - l * 0.5, transform: [{ scaleX: 1 - l * 0.35 }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x * k, top: y * k, width: w * k, height: 6 * k, borderRadius: 3 * k, backgroundColor: 'rgba(34,29,23,0.14)' }, style]} />
  );
}

export type CharacterProps = {
  size: number;
  action: string;
  playing: boolean;
};
