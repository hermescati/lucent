import { useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { meltLook } from './melt.android';
import { ahead, SwipeProgressContext, swipePhase } from '../swipe/SwipeBack.android';
import { ScreenHiddenContext, SwipeRoleContext } from '../swipe/role.android';
import { barMotion, swipeMotion } from '../tokens';

const meltIn = { duration: barMotion.meltIn, easing: Easing.out(Easing.cubic) };

/**
 * A push or a pop moves the screens under one set of bars on iOS: their buttons stay where they stand while the pages
 * slide. So the top screen's buttons hold against its slide, and the uncovered screen's hold against its parallax.
 * Buttons only one of the two screens has pop in and out: they blur, swell and fade (`meltLook`), going as their screen
 * goes and coming as it comes; held back, nothing changes. The navigation bar's buttons and the bottom toolbar's both
 * do. `pushed` is whether the screen came in over another, and so starts gone, to pop in as it slides in.
 */
export const useSwipeMelt = (pushed: boolean) => {
  const role = useContext(SwipeRoleContext);
  const swipe = useContext(SwipeProgressContext);
  const { width } = useWindowDimensions();
  const melt = useSharedValue(pushed ? 1 : 0);
  // The buttons come in once the screen does: as a push slides it in, or, for a screen shown another way, once the
  // bar is up.
  const screenHidden = useContext(ScreenHiddenContext);
  useAnimatedReaction(
    () => screenHidden?.get() ?? 0,
    (now, before) => {
      if (now !== 0 || before === 0) return;
      // Slid in, its buttons pop in as the push starts, as iOS's do.
      const delay = before != null ? 0 : barMotion.itemsDelay;
      melt.set(-Math.abs(melt.get()));
      melt.set(withDelay(delay, withTiming(0, meltIn)));
    },
  );
  useAnimatedReaction(
    () => swipe?.phase.get() ?? swipePhase.idle,
    (phase, previous) => {
      if (phase === previous || !role) return;
      if ((role === 'top' && phase === swipePhase.going) || (role === 'below' && phase === swipePhase.pushing)) {
        melt.set(Math.abs(melt.get()));
        melt.set(withTiming(1, { duration: barMotion.meltOut }));
      } else if (role === 'below' && phase === swipePhase.going) {
        melt.set(-Math.abs(melt.get()));
        melt.set(withTiming(0, meltIn));
      } else if (role === 'below') {
        // Uncovered by a drag, it waits gone; back at rest, it's whole for the next time it shows.
        melt.set(phase === swipePhase.idle ? 0 : 1);
      }
    },
  );
  const holdStyle = useAnimatedStyle(() => {
    const phase = swipe?.phase.get() ?? swipePhase.idle;
    if (!role || phase === swipePhase.idle) return { transform: [{ translateX: 0 }] };
    const progress = Math.max(swipe?.progress.get() ?? 0, 0);
    return {
      transform: [
        { translateX: ahead * (role === 'top' ? -progress * width : (1 - progress) * width * swipeMotion.parallax) },
      ],
    };
  });
  // Held the same way, and crossing over with the swipe rather than popping: going as its screen goes, coming as it
  // comes. iOS 27 does this with a search field that stays under the bar's row.
  const crossStyle = useAnimatedStyle(() => {
    const phase = swipe?.phase.get() ?? swipePhase.idle;
    if (!role || phase === swipePhase.idle) return { opacity: 1, transform: [{ translateX: 0 }] };
    const progress = Math.min(Math.max(swipe?.progress.get() ?? 0, 0), 1);
    return {
      opacity: role === 'top' ? 1 - progress : progress,
      transform: [
        { translateX: ahead * (role === 'top' ? -progress * width : (1 - progress) * width * swipeMotion.parallax) },
      ],
    };
  });
  const meltStyle = useAnimatedStyle(() => {
    const look = meltLook(melt.get());
    return { opacity: look.opacity, transform: [{ scale: look.scale }] };
  });
  const meltBlur = useAnimatedProps(() => ({ radius: meltLook(melt.get()).blur }));
  return { melt, holdStyle, crossStyle, meltStyle, meltBlur };
};
