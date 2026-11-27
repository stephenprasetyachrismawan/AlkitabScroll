// Arka, the lion cub: front-facing, a round mane that swells when he roars.
import { memo } from 'react';
import { useAnimatedStyle } from 'react-native-reanimated';
import { LOOP_MS, type Action } from '../../lib/characters';
import { Arc, B, blink, CHEEK, G, INK, MOUTH, Shadow, useLoop, wave, type CharacterProps } from './kit';

const MANE = '#C8692B';
const MANE_IN = '#D9822B';
const FUR = '#F2C27A';
const BODY = '#EDB66A';
const MUZZLE = '#FBE3B8';
const NOSE = '#5A3214';
const EAR_IN = '#C8692B';
const SHIELD = '#4D6A8C';
const SHIELD_RIM = '#C9A227';

const MANE_PUFFS = Array.from({ length: 11 }, (_, i) => {
  const a = (i / 11) * Math.PI * 2;
  return [50 + Math.cos(a) * 21 - 10, 40 + Math.sin(a) * 21 - 10] as const;
});

/** 0..1 roar strength: builds, holds, eases off, then rests for the end of the loop. */
function roarAt(v: number) {
  'worklet';
  if (v < 0.15 || v > 0.75) return 0;
  if (v < 0.3) return (v - 0.15) / 0.15;
  if (v < 0.55) return 1;
  return 1 - (v - 0.55) / 0.2;
}

function ArkaBase({ size, action: a, playing }: CharacterProps) {
  const action = a as Action;
  const k = size / 100;
  const t = useLoop(playing, LOOP_MS[action] ?? 3200);
  const roaring = action === 'roar';

  const head = useAnimatedStyle(() => {
    const v = t.value;
    if (roaring) return { transform: [{ translateY: -3 * roarAt(v) * k }, { rotate: `${-4 * roarAt(v)}deg` }] };
    return { transform: [{ rotate: `${2.5 * wave(v)}deg` }] };
  });
  const mane = useAnimatedStyle(() => {
    const v = t.value;
    const s = roaring ? 1 + 0.09 * roarAt(v) : 1 + 0.025 * wave(v, 2);
    return { transform: [{ scale: s }] };
  });
  const body = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 + 0.03 * wave(t.value) }] }));
  const tail = useAnimatedStyle(() => ({ transform: [{ rotate: `${14 * wave(t.value, 2)}deg` }] }));
  const mouth = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.2 + 0.8 * roarAt(t.value) }] }));
  const lines = useAnimatedStyle(() => {
    const r = roarAt(t.value);
    return { opacity: r, transform: [{ translateX: 4 * r * k }] };
  });
  const eyes = useAnimatedStyle(() => {
    const v = t.value;
    const look = action === 'guard' ? 1.6 * Math.sign(wave(v)) * Math.min(1, Math.abs(wave(v)) * 3) : 0;
    return { transform: [{ translateX: look * k }, { scaleY: roaring ? 1 : blink(v) }] };
  });
  const shield = useAnimatedStyle(() => ({ transform: [{ translateY: 1.5 * wave(t.value) * k }] }));

  return (
    <>
      <Shadow k={k} />
      <G k={k} ox={70} oy={80} style={tail}>
        <B x={60} y={76} w={20} h={6} c={BODY} k={k} rot={-28} />
        <B x={75} y={67} w={10} h={10} c={MANE} k={k} />
      </G>
      <G k={k} ox={50} oy={90} style={body}>
        <B x={32} y={58} w={36} h={32} r={16} c={BODY} k={k} />
        <B x={40} y={65} w={20} h={21} r={10} c={MUZZLE} k={k} />
      </G>
      <B x={33} y={82} w={13} h={10} r={5} c={BODY} k={k} />
      <B x={54} y={82} w={13} h={10} r={5} c={BODY} k={k} />
      {action === 'guard' ? (
        <G k={k} style={shield}>
          <B x={55} y={60} w={22} h={26} r={10} c={SHIELD_RIM} k={k} />
          <B x={57.5} y={62.5} w={17} h={21} r={8} c={SHIELD} k={k} />
          <B x={64.5} y={66} w={3} h={14} r={1.5} c={SHIELD_RIM} k={k} />
          <B x={60} y={70.5} w={12} h={3} r={1.5} c={SHIELD_RIM} k={k} />
        </G>
      ) : null}
      <G k={k} ox={50} oy={62} style={head}>
        <G k={k} ox={50} oy={40} style={mane}>
          {MANE_PUFFS.map(([x, y], i) => (
            <B key={i} x={x} y={y} w={20} h={20} c={MANE} k={k} />
          ))}
          <B x={27} y={17} w={46} h={46} c={MANE_IN} k={k} />
        </G>
        <B x={29} y={17} w={13} h={13} c={FUR} k={k} />
        <B x={58} y={17} w={13} h={13} c={FUR} k={k} />
        <B x={32} y={20} w={7} h={7} c={EAR_IN} k={k} />
        <B x={61} y={20} w={7} h={7} c={EAR_IN} k={k} />
        <B x={31} y={22} w={38} h={36} r={18} c={FUR} k={k} />
        {action === 'stand' || action === 'guard' ? (
          <>
            <B x={38} y={31} w={8} h={2.2} c={NOSE} k={k} rot={10} />
            <B x={54} y={31} w={8} h={2.2} c={NOSE} k={k} rot={-10} />
          </>
        ) : null}
        <G k={k} ox={50} oy={37} style={eyes}>
          <B x={40} y={34} w={5} h={6.5} c={INK} k={k} />
          <B x={55} y={34} w={5} h={6.5} c={INK} k={k} />
          <B x={41} y={35} w={1.8} h={1.8} c="#FFFFFF" k={k} />
          <B x={56} y={35} w={1.8} h={1.8} c="#FFFFFF" k={k} />
        </G>
        <B x={34} y={44} w={6} h={4} c={CHEEK} k={k} style={{ opacity: 0.7 }} />
        <B x={60} y={44} w={6} h={4} c={CHEEK} k={k} style={{ opacity: 0.7 }} />
        <B x={40} y={42} w={20} h={13} r={6.5} c={MUZZLE} k={k} />
        <B x={46.5} y={42} w={7} h={5} r={2.5} c={NOSE} k={k} />
        {roaring ? (
          <G k={k} ox={50} oy={49} style={mouth}>
            <B x={45} y={49} w={10} h={8} r={4} c={MOUTH} k={k} />
          </G>
        ) : (
          <Arc x={46} y={46.5} w={8} c={NOSE} k={k} thick={1.5} />
        )}
      </G>
      {roaring ? (
        <G k={k} style={lines}>
          <B x={80} y={28} w={8} h={2.4} c={MANE} k={k} rot={-25} />
          <B x={82} y={38} w={9} h={2.4} c={MANE} k={k} />
          <B x={80} y={48} w={8} h={2.4} c={MANE} k={k} rot={25} />
          <B x={12} y={28} w={8} h={2.4} c={MANE} k={k} rot={25} />
          <B x={9} y={38} w={9} h={2.4} c={MANE} k={k} />
          <B x={12} y={48} w={8} h={2.4} c={MANE} k={k} rot={-25} />
        </G>
      ) : null}
    </>
  );
}

export const Arka = memo(ArkaBase);
