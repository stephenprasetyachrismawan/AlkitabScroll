// Selo, the lamb: Selah's mascot. Front-facing, wool of round puffs.
import { memo } from 'react';
import { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import type { Action } from '../../lib/characters';
import { LOOP_MS } from '../../lib/characters';
import { Arc, B, blink, CHEEK, Floater, G, Glyph, GOLD, HalfDisc, Heart, INK, MOUTH, Rimmed, Shadow, useLoop, wave, type CharacterProps } from './kit';

const WOOL = '#FFF8EA';
const SHADE = '#E3D3B6';
const FACE = '#EBC9A0';
const EAR = '#B07A4F';
const EAR_IN = '#E9A79B';
const HOOF = '#6B4A35';
const LOVE = '#D45A78';

function SeloBase({ size, action: a, playing }: CharacterProps) {
  const action = a as Action;
  const k = size / 100;
  const t = useLoop(playing, LOOP_MS[action] ?? 3600);

  const happyEyes = action === 'hop' || action === 'love' || action === 'sing' || action === 'sway';
  const closedEyes = action === 'pray' || action === 'sleep';

  // hop: one soft hop per loop, resting on the ground for the last fifth
  const whole = useAnimatedStyle(() => {
    const v = t.value;
    if (action === 'hop') {
      const p = Math.min(v / 0.8, 1);
      const lift = Math.sin(p * Math.PI);
      return { transform: [{ translateY: -16 * lift * k }] };
    }
    if (action === 'sway') return { transform: [{ rotate: `${3.5 * wave(v)}deg` }] };
    if (action === 'sing' || action === 'love') return { transform: [{ rotate: `${2 * wave(v)}deg` }] };
    return { transform: [{ scale: 1 + 0.012 * wave(v) }] };
  });
  // 0..1, how far off the ground (for the shadow)
  const lift = useDerivedValue(() => (action === 'hop' ? Math.sin(Math.min(t.value / 0.8, 1) * Math.PI) : 0));

  const head = useAnimatedStyle(() => {
    const v = t.value;
    if (action === 'sleep') return { transform: [{ rotate: `${10 + 2 * wave(v)}deg` }, { translateY: 2 * k }] };
    if (action === 'pray') return { transform: [{ translateY: (1.5 + wave(v)) * k }] };
    if (action === 'sing') return { transform: [{ rotate: `${5 * wave(v, 2)}deg` }] };
    if (action === 'wave') return { transform: [{ rotate: `${4 * wave(v)}deg` }] };
    return { transform: [{ rotate: `${2 * wave(v, 1, 0.25)}deg` }] };
  });
  const earL = useAnimatedStyle(() => ({ transform: [{ rotate: `${(action === 'hop' ? -12 : -4) * (0.5 + 0.5 * wave(t.value, 2))}deg` }] }));
  const earR = useAnimatedStyle(() => ({ transform: [{ rotate: `${(action === 'hop' ? 12 : 4) * (0.5 + 0.5 * wave(t.value, 2))}deg` }] }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink(t.value) }] }));
  const mouth = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.55 + 0.45 * Math.abs(wave(t.value, 2)) }] }));
  const body = useAnimatedStyle(() => {
    if (action !== 'hop') return {};
    const v = t.value;
    // squash a touch when landing
    const land = v > 0.76 && v < 0.9 ? Math.sin(((v - 0.76) / 0.14) * Math.PI) : 0;
    return { transform: [{ scaleY: 1 - 0.06 * land }, { scaleX: 1 + 0.04 * land }] };
  });

  // arms: pivot at the shoulder; rest = hanging down
  const armL = useAnimatedStyle(() => {
    const v = t.value;
    let r = 8;
    if (action === 'hop') r = 150 + 12 * wave(v, 2);
    else if (action === 'pray' || action === 'love') r = -58;
    else if (action === 'sing') r = 40 + 10 * wave(v, 2);
    return { transform: [{ rotate: `${r}deg` }] };
  });
  const armR = useAnimatedStyle(() => {
    const v = t.value;
    let r = -8;
    if (action === 'hop') r = -150 - 12 * wave(v, 2);
    else if (action === 'pray' || action === 'love') r = 58;
    else if (action === 'wave') r = -150 + 22 * wave(v, 2);
    else if (action === 'sing') r = -40 - 10 * wave(v, 2);
    return { transform: [{ rotate: `${r}deg` }] };
  });
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.14 * Math.max(0, wave(t.value, 2)) }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.45 + 0.35 * wave(t.value) }));

  return (
    <>
      <Shadow k={k} lift={lift} />
      <G k={k} ox={50} oy={92} style={whole}>
        {/* legs */}
        <B x={37} y={76} w={9} h={16} r={4} c={HOOF} k={k} />
        <B x={54} y={76} w={9} h={16} r={4} c={HOOF} k={k} />
        {/* body */}
        <G k={k} ox={50} oy={90} style={body}>
          <Rimmed x={24} y={50} w={52} h={36} c={WOOL} rc={SHADE} k={k} />
          {(
            [
              [19, 56, 18, 18],
              [63, 56, 18, 18],
              [30, 45, 20, 18],
              [50, 45, 20, 18],
              [28, 70, 18, 16],
              [54, 70, 18, 16],
            ] as const
          ).map(([x, y, w, h], i) => (
            <Rimmed key={i} x={x} y={y} w={w} h={h} c={WOOL} rc={SHADE} k={k} />
          ))}
          <B x={26} y={52} w={48} h={32} c={WOOL} k={k} />
        </G>
        {/* arms */}
        <G k={k} ox={28} oy={60} style={armL}>
          <Rimmed x={23} y={58} w={10} h={18} c={WOOL} rc={SHADE} k={k} />
          <B x={23.5} y={71} w={9} h={5} r={2.5} c={HOOF} k={k} />
        </G>
        <G k={k} ox={72} oy={60} style={armR}>
          <Rimmed x={67} y={58} w={10} h={18} c={WOOL} rc={SHADE} k={k} />
          <B x={67.5} y={71} w={9} h={5} r={2.5} c={HOOF} k={k} />
        </G>
        {action === 'love' ? (
          <G k={k} ox={50} oy={62} style={heart}>
            <Heart cx={50} cy={64} s={15} c={LOVE} k={k} />
          </G>
        ) : null}
        {/* head */}
        <G k={k} ox={50} oy={56} style={head}>
          <G k={k} ox={30} oy={36} style={earL}>
            <B x={11} y={31} w={21} h={10} c={EAR} k={k} rot={-18} />
            <B x={14} y={33.5} w={13} h={5} c={EAR_IN} k={k} rot={-18} />
          </G>
          <G k={k} ox={70} oy={36} style={earR}>
            <B x={68} y={31} w={21} h={10} c={EAR} k={k} rot={18} />
            <B x={73} y={33.5} w={13} h={5} c={EAR_IN} k={k} rot={18} />
          </G>
          <Rimmed x={24} y={15} w={20} h={20} c={WOOL} rc={SHADE} k={k} />
          <Rimmed x={39} y={10} w={22} h={20} c={WOOL} rc={SHADE} k={k} />
          <Rimmed x={56} y={15} w={20} h={20} c={WOOL} rc={SHADE} k={k} />
          <B x={31} y={21} w={38} h={40} r={18} c={FACE} k={k} />
          <B x={33} y={14} w={14} h={14} c={WOOL} k={k} />
          <B x={43} y={11} w={14} h={14} c={WOOL} k={k} />
          <B x={53} y={14} w={14} h={14} c={WOOL} k={k} />
          {/* eyes */}
          {closedEyes ? (
            <>
              <Arc x={38.5} y={37} w={8} c={INK} k={k} />
              <Arc x={53.5} y={37} w={8} c={INK} k={k} />
            </>
          ) : happyEyes ? (
            <>
              <Arc x={38.5} y={36} w={8} c={INK} k={k} up thick={2} />
              <Arc x={53.5} y={36} w={8} c={INK} k={k} up thick={2} />
            </>
          ) : (
            <G k={k} ox={50} oy={40} style={eyes}>
              <B x={40} y={36} w={5.5} h={7.5} c={INK} k={k} />
              <B x={54.5} y={36} w={5.5} h={7.5} c={INK} k={k} />
              <B x={41} y={37} w={2} h={2} c="#FFFFFF" k={k} />
              <B x={55.5} y={37} w={2} h={2} c="#FFFFFF" k={k} />
            </G>
          )}
          <B x={34} y={46} w={7} h={4.5} c={CHEEK} k={k} style={{ opacity: 0.8 }} />
          <B x={59} y={46} w={7} h={4.5} c={CHEEK} k={k} style={{ opacity: 0.8 }} />
          <B x={47.5} y={45} w={5} h={3.5} c={EAR} k={k} />
          {action === 'sing' ? (
            <G k={k} ox={50} oy={50} style={mouth}>
              <B x={46.5} y={49} w={7} h={7} c={MOUTH} k={k} />
            </G>
          ) : action === 'hop' || action === 'love' ? (
            <HalfDisc x={45.5} y={49} w={9} c={MOUTH} k={k} />
          ) : (
            <Arc x={46} y={47.5} w={8} c={MOUTH} k={k} thick={1.6} />
          )}
        </G>
      </G>
      {action === 'pray' ? (
        <G k={k} style={halo}>
          <B x={36} y={2} w={28} h={7} c="transparent" k={k} style={{ borderWidth: 2 * k, borderColor: GOLD }} />
        </G>
      ) : null}
      {action === 'sleep'
        ? [0, 1, 2].map((i) => (
            <Floater key={i} t={t} k={k} i={i} count={3} x={70} y={20} rise={18} dx={10}>
              <Glyph ch="z" size={9 + i * 2} c={EAR} k={k} />
            </Floater>
          ))
        : null}
      {action === 'love'
        ? [0, 1, 2].map((i) => (
            <Floater key={i} t={t} k={k} i={i} count={3} x={24 + i * 22} y={20} rise={18} dx={i === 1 ? 0 : i === 0 ? -6 : 6}>
              <Heart cx={4} cy={4} s={8} c={LOVE} k={k} />
            </Floater>
          ))
        : null}
      {action === 'sing'
        ? [0, 1].map((i) => (
            <Floater key={i} t={t} k={k} i={i} count={2} x={i ? 16 : 74} y={22} rise={20} dx={i ? -8 : 8}>
              <Glyph ch={i ? '♫' : '♪'} size={13} c={EAR} k={k} />
            </Floater>
          ))
        : null}
    </>
  );
}

export const Selo = memo(SeloBase);
