// Motion tokens, from taste-skill's motion reference, ported to Reanimated.
// One UI ease-out for every step, one entrance curve for things settling, no overshoot.
// Press 90ms, hover-ish answers 150ms, indicators travel 240ms, entrances ~520–700ms.
import { Easing, ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/** --ease: cubic-bezier(.2,.8,.2,1), every UI step */
export const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
/** --m-ease-enter: cubic-bezier(.22,1,.36,1), something arriving and settling */
export const EASE_ENTER = Easing.bezier(0.22, 1, 0.36, 1);
/** --m-ease-io: only for travel */
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

// Kept for older imports.
export const EASE_OUT_EXPO = EASE_ENTER;
export const EASE_OUT_QUINT = EASE_ENTER;

export const DURATION = {
  press: 90,
  release: 150,
  quick: 200,
  slide: 240,
  move: 320,
  enter: 560,
  stagger: 60,
} as const;

export const timing = (duration: number = DURATION.move, easing = EASE): WithTimingConfig => ({
  duration,
  easing,
  reduceMotion: ReduceMotion.System,
});

export const enter = (duration: number = DURATION.enter): WithTimingConfig => timing(duration, EASE_ENTER);

/** Critically damped: settles fast, never overshoots. */
export const SPRING: WithSpringConfig = {
  damping: 26,
  stiffness: 320,
  mass: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
};
