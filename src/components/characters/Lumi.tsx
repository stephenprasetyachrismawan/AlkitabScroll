// Lumi, the little clay oil lamp: a face on the bowl, a living flame on the spout.
import { memo } from 'react';
import { View } from 'react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import { LOOP_MS, type Action } from '../../lib/characters';
import { Arc, B, blink, CHEEK, G, INK, MOUTH, Shadow, useLoop, wave, type CharacterProps } from './kit';

const CLAY = '#C98A4B';
const CLAY_DARK = '#9C6232';
const RIM = '#E3AE72';
const FLAME = '#F2A93B';
const FLAME_IN = '#FFD66B';
const CORE = '#FFF6D6';
const GLOW = 'rgba(255,196,84,0.28)';

/** A teardrop (round bottom, pointed top) centred at cx with its base at `base`. */
function Drop({ cx, base, w, c, k }: { cx: number; base: number; w: number; c: string; k: number }) {
  const q = w * 0.72;
  return (
    <>
      <B x={cx - q / 2} y={base - w * 1.25} w={q} h={q} r={q * 0.12} c={c} k={k} rot={45} />
      <B x={cx - w / 2} y={base - w} w={w} h={w} c={c} k={k} />
    </>
  );
}

function LumiBase({ size, action: a, playing }: CharacterProps) {
  const action = a as Action;
  const k = size / 100;
  const t = useLoop(playing, LOOP_MS[action] ?? 2800);

  const flame = useAnimatedStyle(() => {
    const v = t.value;
    return {
      transform: [{ rotate: `${4 * wave(v, 3)}deg` }, { scaleY: 1 + 0.12 * wave(v, 2) }, { scaleX: 1 - 0.06 * wave(v, 2) }],
    };
  });
  const glow = useAnimatedStyle(() => {
    const v = t.value;
    return { opacity: 0.6 + 0.4 * wave(v, 2), transform: [{ scale: 1 + 0.1 * wave(v, 2) }] };
  });
  const lamp = useAnimatedStyle(() => ({ transform: [{ translateY: -1.5 * Math.abs(wave(t.value)) * k }] }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink(t.value) }] }));

  return (
    <>
      <G k={k} ox={78} oy={30} style={glow}>
        <B x={58} y={8} w={40} h={40} c={GLOW} k={k} />
        <B x={66} y={16} w={24} h={24} c={GLOW} k={k} />
      </G>
      <Shadow k={k} x={22} w={56} />
      <G k={k} style={lamp}>
        {/* handle: a ring on the left */}
        <View
          style={{
            position: 'absolute',
            left: 8 * k,
            top: 56 * k,
            width: 22 * k,
            height: 20 * k,
            borderRadius: 10 * k,
            borderWidth: 5 * k,
            borderColor: CLAY_DARK,
          }}
        />
        <B x={62} y={50} w={24} h={15} r={7.5} c={CLAY} k={k} rot={-18} />
        <B x={20} y={56} w={58} h={32} r={16} c={CLAY} k={k} />
        <B x={28} y={52} w={38} h={10} r={5} c={RIM} k={k} />
        <B x={41} y={54} w={12} h={4} r={2} c={CLAY_DARK} k={k} />
        <G k={k} ox={46} oy={70} style={eyes}>
          <B x={37} y={67} w={4.5} h={5.5} c={INK} k={k} />
          <B x={51} y={67} w={4.5} h={5.5} c={INK} k={k} />
        </G>
        <B x={31} y={75} w={6} h={4} c={CHEEK} k={k} style={{ opacity: 0.85 }} />
        <B x={56} y={75} w={6} h={4} c={CHEEK} k={k} style={{ opacity: 0.85 }} />
        <Arc x={42} y={74} w={8} c={MOUTH} k={k} thick={1.6} />
        <G k={k} ox={80} oy={48} style={flame}>
          <Drop cx={80} base={50} w={15} c={FLAME} k={k} />
          <Drop cx={80} base={49} w={9.5} c={FLAME_IN} k={k} />
          <Drop cx={80} base={48} w={4.5} c={CORE} k={k} />
        </G>
      </G>
    </>
  );
}

export const Lumi = memo(LumiBase);
