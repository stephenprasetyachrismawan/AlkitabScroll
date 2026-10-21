// Motion tokens. Strong ease-outs, no bounce (taste-skill motion rules):
// UI feedback 120–220ms, small moves 280–420ms, entrances 450–650ms, staggers 50–90ms.
import { Easing, ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

export const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_OUT_QUINT = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

export const DURATION = {
  press: 140,
  quick: 220,
  move: 360,
  enter: 560,
  stagger: 70,
} as const;

export const timing = (duration: number = DURATION.move): WithTimingConfig => ({
  duration,
  easing: EASE_OUT_EXPO,
  reduceMotion: ReduceMotion.System,
});

/** Critically damped: settles fast, never overshoots. */
export const SPRING: WithSpringConfig = {
  damping: 26,
  stiffness: 320,
  mass: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
};
