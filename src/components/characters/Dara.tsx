// Dara, the dove: side view facing right, an olive twig in her beak.
import { memo } from 'react';
import { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { LOOP_MS, type Action } from '../../lib/characters';
import { B, blink, CHEEK, G, INK, Rimmed, Shadow, useLoop, wave, type CharacterProps } from './kit';

const WHITE = '#FFFFFF';
const SHADE = '#D9D1C3';
const WING = '#F3EFE7';
const WING_FAR = '#E4DDD0';
const TIP = '#C9BFAE';
const BEAK = '#E0A23B';
const STEM = '#6B8E4E';
const LEAF = '#7FB069';
const FEET = '#E58A6B';

function DaraBase({ size, action: a, playing }: CharacterProps) {
  const action = a as Action;
  const k = size / 100;
  const t = useLoop(playing, LOOP_MS[action] ?? 3000);
  const fly = action === 'fly';

  const lift = useDerivedValue(() => 0.6 + 0.2 * wave(t.value));
  const bird = useAnimatedStyle(() => {
    const v = t.value;
    if (fly) return { transform: [{ translateY: (-10 - 5 * wave(v, 3)) * k }, { rotate: `${-3 + 3 * wave(v)}deg` }] };
    return { transform: [{ translateY: (-8 - 3 * wave(v)) * k }, { translateX: 3 * wave(v, 1, 0.25) * k }, { rotate: `${2 * wave(v)}deg` }] };
  });
  // wing angle: pivot at the shoulder, wing reaching back; positive lifts its tip
  const near = useAnimatedStyle(() => {
    const v = t.value;
    const r = fly ? 50 * (0.5 + 0.5 * wave(v, 3)) - 18 : 22 + 6 * wave(v);
    return { transform: [{ rotate: `${r}deg` }] };
  });
  const far = useAnimatedStyle(() => {
    const v = t.value;
    const r = fly ? 44 * (0.5 + 0.5 * wave(v, 3, -0.06)) - 10 : 26 + 5 * wave(v, 1, -0.1);
    return { transform: [{ rotate: `${r}deg` }] };
  });
  const eye = useAnimatedStyle(() => ({ transform: [{ scaleY: blink(t.value) }] }));

  return (
    <>
      <Shadow k={k} x={34} w={34} lift={lift} />
      <G k={k} ox={50} oy={56} style={bird}>
        <G k={k} ox={56} oy={48} style={far}>
          <B x={24} y={34} w={34} h={14} r={7} c={WING_FAR} k={k} />
        </G>
        <B x={13} y={50} w={24} h={11} r={5.5} c={WING_FAR} k={k} rot={-14} />
        <B x={12} y={55} w={18} h={8} r={4} c={TIP} k={k} rot={-14} />
        {/* feet tucked under */}
        <B x={44} y={70} w={4} h={7} r={2} c={FEET} k={k} />
        <B x={52} y={70} w={4} h={7} r={2} c={FEET} k={k} />
        <Rimmed x={24} y={42} w={48} h={30} c={WHITE} rc={SHADE} k={k} />
        <Rimmed x={55} y={28} w={25} h={25} c={WHITE} rc={SHADE} k={k} />
        <B x={45} y={42} w={20} h={16} c={WHITE} k={k} />
        <G k={k} ox={69} oy={39} style={eye}>
          <B x={67} y={36} w={4.5} h={5.5} c={INK} k={k} />
        </G>
        <B x={62} y={44} w={6} h={3.5} c={CHEEK} k={k} style={{ opacity: 0.75 }} />
        {/* beak and olive twig */}
        <B x={84} y={42} w={14} h={2} r={1} c={STEM} k={k} rot={18} />
        <B x={88} y={37} w={9} h={4.5} c={LEAF} k={k} rot={-24} />
        <B x={90} y={46} w={9} h={4.5} c={LEAF} k={k} rot={34} />
        <B x={78} y={38.5} w={10} h={5.5} r={2.75} c={BEAK} k={k} />
        <G k={k} ox={58} oy={50} style={near}>
          <B x={26} y={42} w={36} h={16} r={8} c={WING} k={k} />
          <B x={24} y={46} w={12} h={7} r={3.5} c={TIP} k={k} />
          <B x={30} y={50} w={12} h={7} r={3.5} c={TIP} k={k} />
        </G>
      </G>
    </>
  );
}

export const Dara = memo(DaraBase);
