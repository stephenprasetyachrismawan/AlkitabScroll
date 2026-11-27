// Pipi, the sparrow: round, brown, side view facing right.
import { memo } from 'react';
import { useAnimatedStyle } from 'react-native-reanimated';
import { LOOP_MS, type Action } from '../../lib/characters';
import { B, blink, GOLD, G, INK, Shadow, Sparkle, useLoop, wave, type CharacterProps } from './kit';

const BODY = '#A9774F';
const BELLY = '#F1DEC4';
const CAP = '#7A5032';
const CHEEK = '#FBF5EA';
const BEAK = '#3A2A1E';
const LEGS = '#C98B5E';
const WING = '#8A5A36';
const STRIPE = '#5E3B22';
const SEED = '#C9A227';

/** 0..1 peck depth: two quick pecks, then a pause to look around. */
function peckAt(v: number) {
  'worklet';
  const one = (s: number) => {
    const p = (v - s) / 0.16;
    return p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0;
  };
  return Math.max(one(0.08), one(0.34));
}

function PipiBase({ size, action: a, playing }: CharacterProps) {
  const action = a as Action;
  const k = size / 100;
  const t = useLoop(playing, LOOP_MS[action] ?? 2800);
  const peck = action === 'peck';

  const bird = useAnimatedStyle(() => {
    const v = t.value;
    if (peck) {
      // after the pecks, a small hop
      const hop = v > 0.62 && v < 0.82 ? Math.sin(((v - 0.62) / 0.2) * Math.PI) : 0;
      return { transform: [{ translateY: -6 * hop * k }, { rotate: `${26 * peckAt(v)}deg` }] };
    }
    return { transform: [{ translateY: -1.5 * Math.abs(wave(v, 2)) * k }] };
  });
  const head = useAnimatedStyle(() => {
    const v = t.value;
    if (peck) return { transform: [{ rotate: `${v > 0.85 ? -6 * Math.sin(((v - 0.85) / 0.15) * Math.PI) : 0}deg` }] };
    return { transform: [{ rotate: `${-16 + 4 * wave(v)}deg` }] };
  });
  const wing = useAnimatedStyle(() => {
    const v = t.value;
    const flutter = peck ? (v > 0.62 && v < 0.82 ? 18 * Math.abs(wave(v, 10)) : 0) : 6 * Math.abs(wave(v, 4)) * (v < 0.3 ? 1 : 0);
    return { transform: [{ rotate: `${flutter}deg` }] };
  });
  const eye = useAnimatedStyle(() => ({ transform: [{ scaleY: blink(t.value) }] }));
  const twinkle = useAnimatedStyle(() => {
    const v = t.value;
    return { opacity: 0.35 + 0.65 * Math.abs(wave(v)), transform: [{ scale: 0.8 + 0.3 * Math.abs(wave(v)) }] };
  });

  return (
    <>
      <Shadow k={k} x={30} w={38} />
      {peck ? (
        <>
          <B x={78} y={89} w={4.5} h={3} c={SEED} k={k} />
          <B x={86} y={90.5} w={4.5} h={3} c={SEED} k={k} />
          <B x={71} y={91} w={4} h={2.6} c={SEED} k={k} />
        </>
      ) : null}
      <G k={k} ox={50} oy={90} style={bird}>
        <B x={44} y={78} w={2.6} h={13} r={1.3} c={LEGS} k={k} />
        <B x={53} y={78} w={2.6} h={13} r={1.3} c={LEGS} k={k} />
        <B x={14} y={56} w={24} h={9} r={4.5} c={CAP} k={k} rot={-24} />
        <B x={26} y={44} w={46} h={40} r={20} c={BODY} k={k} />
        <B x={42} y={58} w={30} h={25} r={12.5} c={BELLY} k={k} />
        <G k={k} ox={58} oy={58} style={head}>
          <B x={50} y={26} w={32} h={31} r={15.5} c={BODY} k={k} />
          <B x={51} y={25} w={27} h={13} r={6.5} c={CAP} k={k} />
          <B x={62} y={40} w={14} h={10} r={5} c={CHEEK} k={k} />
          <G k={k} ox={70} oy={37} style={eye}>
            <B x={68} y={34} w={5} h={5.5} c={INK} k={k} />
            <B x={69} y={34.8} w={1.7} h={1.7} c="#FFFFFF" k={k} />
          </G>
          <B x={80} y={38} w={9} h={5} r={2} c={BEAK} k={k} />
        </G>
        <G k={k} ox={56} oy={54} style={wing}>
          <B x={28} y={50} w={32} h={19} r={9.5} c={WING} k={k} />
          <B x={33} y={55} w={19} h={3} c={STRIPE} k={k} />
          <B x={33} y={61} w={14} h={3} c={STRIPE} k={k} />
        </G>
      </G>
      {action === 'lookup' ? (
        <G k={k} ox={84} oy={12} style={twinkle}>
          <Sparkle cx={84} cy={12} s={11} c={GOLD} k={k} />
          <Sparkle cx={95} cy={24} s={6} c={GOLD} k={k} />
        </G>
      ) : null}
    </>
  );
}

export const Pipi = memo(PipiBase);
