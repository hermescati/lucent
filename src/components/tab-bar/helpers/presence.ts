import {
  Easing,
  withDelay,
  withSequence,
  withTiming,
  type EntryExitAnimationFunction,
  type LayoutAnimationFunction,
  type SharedValue,
} from 'react-native-reanimated';

import { barItemMotion } from '../../../core/motion/island';

// Tabs coming and going move as a navigation bar's island does as one of its buttons shows or hides (BarItems): the
// others slide to their new places a little past and back, and the tab itself grows out of, or shrinks into, a faint
// small glyph.
const { show, hide, overshoot, settle, leaveScale } = barItemMotion;

/** From `from` to `to`, a little past and back, over `duration`, as the island's slots resize. */
export const islandTo = (from: number, to: number, duration: number) => {
  'worklet';
  return withSequence(
    withTiming(to + (to - from) * overshoot, { duration, easing: Easing.out(Easing.quad) }),
    withTiming(to, { duration: settle, easing: Easing.inOut(Easing.quad) }),
  );
};

export const tabSlide: LayoutAnimationFunction = (values) => {
  'worklet';
  return {
    initialValues: {
      originX: values.currentOriginX,
      originY: values.currentOriginY,
      width: values.currentWidth,
      height: values.currentHeight,
    },
    animations: {
      originX: islandTo(values.currentOriginX, values.targetOriginX, show.width),
      originY: withTiming(values.targetOriginY, { duration: 0 }),
      width: islandTo(values.currentWidth, values.targetWidth, show.width),
      height: withTiming(values.targetHeight, { duration: 0 }),
    },
  };
};

// Faint early as it leaves and late as it comes (its opacity the square of how far in it is), as the island's glyphs.
/** A tab growing in as it's added; not before `ready`, so the tabs there as the bar first appears don't. */
export const tabEnterAfter =
  (ready: SharedValue<boolean>): EntryExitAnimationFunction =>
  () => {
    'worklet';
    if (!ready.get()) {
      return { initialValues: {}, animations: {} };
    }
    return tabEnter();
  };

const tabEnter = () => {
  'worklet';
  const timing = { duration: show.glyph };
  return {
    initialValues: { opacity: 0, transform: [{ scale: leaveScale }] },
    animations: {
      opacity: withDelay(show.glyphDelay, withTiming(1, { ...timing, easing: Easing.in(Easing.quad) })),
      transform: [{ scale: withDelay(show.glyphDelay, withTiming(1, { ...timing, easing: Easing.linear })) }],
    },
  };
};

export const tabExit: EntryExitAnimationFunction = () => {
  'worklet';
  const timing = { duration: hide.glyph };
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: {
      opacity: withTiming(0, { ...timing, easing: Easing.out(Easing.quad) }),
      transform: [{ scale: withTiming(leaveScale, { ...timing, easing: Easing.linear }) }],
    },
  };
};
