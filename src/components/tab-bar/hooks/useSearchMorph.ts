import { useCallback, useEffect } from 'react';
import {
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { leanBy } from '../../../core/glass/useShapePress';
import { useSolidGlass } from '../../../theme/solid';
import { clamp01, fieldGlyphCenter, fullHeight, lerp, modeHeight, modeInset, modeShrink, pullBy } from '../helpers/bar';
import { layout, motion } from '../tokens';
import type { BarState } from './useBarState';

/** Opens and closes search, and the styles that morph the search tab into the field. */
export const useSearchMorph = (bar: BarState) => {
  const {
    backBump,
    barLeft,
    barLift,
    barWidth,
    centering,
    collapsed,
    hasAccessory,
    tuck,
    fieldFit,
    frameWidth,
    fullWidth,
    circleCenter,
    iconDim,
    keyboardProgress,
    modeTarget,
    scaleY,
    searchBump,
    searchDip,
    searchFocused,
    searchMode,
    searchPop,
    searchPress,
    searchRaise,
  } = bar;
  const solid = useSolidGlass();

  const morphSearch = useCallback(
    (open: boolean) => {
      const target = open ? 1 : 0;
      if (modeTarget.get() === target) {
        return;
      }
      modeTarget.set(target);
      if (open) {
        searchBump.set(withSpring(0, motion.springs.searchBumpOut));
        searchMode.set(
          withDelay(
            motion.searchMorph.delay,
            withSpring(1, {
              ...motion.springs.searchOpen,
              velocity: motion.searchMorph.openVelocity,
            }),
          ),
        );
        searchPop.set(withDelay(motion.searchPop.delay, withSpring(1, motion.springs.searchPop)));
      } else {
        const typing = keyboardProgress.get() > 0.5;
        const delay = typing ? 0 : motion.searchClose.delay;
        searchPop.set(
          withDelay(delay, withSpring(0, typing ? motion.springs.searchKeyboardAbsorb : motion.springs.searchAbsorb)),
        );
        searchMode.set(
          withDelay(delay, withSpring(0, typing ? motion.springs.searchKeyboardMorph : motion.springs.searchMorph)),
        );
      }
    },
    [modeTarget, searchMode, searchPop, searchBump, keyboardProgress],
  );

  useAnimatedReaction(
    () => modeTarget.get() === 0 && searchMode.get() < 1 - motion.searchBump.at,
    (hit, previous) => {
      if (hit && previous === false) {
        searchBump.set(
          withSequence(withSpring(1, motion.springs.searchBumpIn), withSpring(0, motion.springs.searchBumpOut)),
        );
      }
    },
  );

  useAnimatedReaction(
    () => modeTarget.get() === 1 && searchMode.get() > motion.searchBump.at,
    (hit, previous) => {
      if (hit && previous === false) {
        backBump.set(
          withSequence(withSpring(1, motion.springs.searchBumpIn), withSpring(0, motion.springs.searchBumpOut)),
        );
      }
    },
  );

  useEffect(() => {
    morphSearch(searchFocused);
  }, [searchFocused, morphSearch]);

  const searchScale = useDerivedValue(
    () =>
      scaleY.get() *
      lerp(1, modeShrink, Math.pow(clamp01(searchMode.get()), motion.searchMorph.heightLag)) *
      (1 + searchPress.press.get() * motion.pressGrow),
  );
  const searchFillStyle = useAnimatedStyle(() => {
    const mode = searchMode.get();
    const travel = circleCenter - fieldGlyphCenter;
    if (modeTarget.get() === 0) {
      return {
        opacity: searchPress.press.get() * clamp01(searchPop.get() * motion.searchClose.lightHold),
        transform: [
          {
            translateX:
              (-motion.searchPop.shift * (1 - clamp01(searchPop.get())) * clamp01(mode)) /
              Math.max(searchScale.get(), 0.01),
          },
          { scale: lerp(motion.searchClose.circleScale, 1, clamp01(searchPop.get()) ** 2) },
        ],
      };
    }
    return {
      opacity:
        searchPress.press.get() *
        (mode < 0.5 ? 1 - clamp01(mode * motion.searchTabs.pressFade) : clamp01((searchPop.get() - 0.75) * 4)),
      transform: [{ translateX: mode < 0.5 ? -travel * clamp01(mode) : 0 }],
    };
  });
  const searchInkStyle = useAnimatedStyle(() => ({
    opacity: 1 - searchPress.press.get() * iconDim,
  }));

  const keyboardReach = Math.max(0, barLeft + modeInset - motion.searchKeyboard.edge);
  const keyboardSpread = useDerivedValue(() => keyboardReach * clamp01(searchRaise.get()));

  useAnimatedReaction(
    () => ({ closing: modeTarget.get() === 0, raised: searchRaise.get() >= motion.searchKeyboard.dipAt }),
    (next, previous) => {
      if (next.closing && !next.raised && previous?.raised) {
        searchDip.set(
          withSequence(
            withSpring(motion.searchKeyboard.dip, motion.springs.searchDipIn),
            withSpring(0, motion.springs.searchDipOut),
          ),
        );
      }
    },
  );
  const tileSink = useDerivedValue(() => -barLift.get());
  // Minimizing, the bar first shrinks a little (motion.tuck), about the middle of it and its accessory together; the
  // shrink gives way as it gathers into its circles.
  const tuckScale = useDerivedValue(() => lerp(1, motion.tuck.scale, tuck.get() * (1 - collapsed.get())));
  const barLiftStyle = useAnimatedStyle(() => ({
    // A fitted bar without search's circle sits in the middle, until it minimizes to its circle at the left.
    transform: [
      { translateX: centering.get() * (1 - collapsed.get()) },
      {
        translateY:
          barLift.get() +
          (hasAccessory ? (layout.accessory.gap + layout.accessory.height) / 2 : 0) * (tuckScale.get() - 1),
      },
      { scale: tuckScale.get() },
    ],
  }));
  const searchSpreadStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: keyboardSpread.get() },
      {
        // Rising to the middle of a field grown for larger text (helpers/bar searchFieldFit).
        translateY:
          searchDip.get() - (fieldFit.rise / 2) * Math.pow(clamp01(searchMode.get()), motion.searchMorph.heightLag),
      },
    ],
  }));

  const pillModeStyle = useAnimatedStyle(() => ({
    opacity:
      1 - clamp01(searchMode.get() * (modeTarget.get() === 1 ? motion.searchTabs.fade : motion.searchTabs.closeFade)),
    transform: [{ translateY: tileSink.get() }],
  }));
  const searchCenter = useDerivedValue(() => circleCenter);
  const rowFit = useDerivedValue(() => {
    if (modeTarget.get() === 1) {
      return { scale: 1, x: 0, y: 0 };
    }
    const settled = clamp01(searchMode.get());
    const width = Math.max(barWidth.get(), 1);
    return {
      scale: lerp(width, modeHeight, settled) / width,
      x: modeInset * settled,
      y: modeInset * Math.pow(settled, motion.searchMorph.heightLag),
    };
  });
  // How far the tabs show: the glass's width, as it grows to reveal a new tab or closes over a leaving one, down to the
  // field's circle as search opens. The row spans the bar's whole room (fullWidth), so the clip slides along it.
  const rowClipStyle = useAnimatedStyle(() => {
    const reach = Math.min(frameWidth.get(), fullWidth);
    const shown = modeTarget.get() === 1 ? lerp(reach, modeInset + modeHeight, clamp01(searchMode.get())) : reach;
    return { transform: [{ translateX: shown - fullWidth }] };
  }, [fullWidth]);
  const rowUnclipStyle = useAnimatedStyle(() => {
    const reach = Math.min(frameWidth.get(), fullWidth);
    const shown = modeTarget.get() === 1 ? lerp(reach, modeInset + modeHeight, clamp01(searchMode.get())) : reach;
    return { transform: [{ translateX: fullWidth - shown }] };
  }, [fullWidth]);
  const rowFitStyle = useAnimatedStyle(() => {
    const fit = rowFit.get();
    // Scaled about the row's middle, which spans the bar's whole room, so its left edge lands at fit.x.
    return {
      transform: [
        { translateX: fit.x - (fullWidth * (1 - fit.scale)) / 2 },
        { translateY: fit.y - (fullHeight * (1 - fit.scale)) / 2 },
        { scale: fit.scale },
      ],
    };
  });
  const rowBlurProps = useAnimatedProps(() => ({
    radius: clamp01(searchMode.get()) * motion.searchTabs.blur,
  }));
  // Pulled by a finger dragged off it, what's on the circle stretches and moves with its glass (useBarGlass).
  const searchContentStyle = useAnimatedStyle(() => {
    const held = (solid ? 0 : searchPress.press.get()) * (1 - clamp01(searchMode.get()));
    const dragged = pullBy(searchPress.pull.get(), held, motion.pull.circle);
    const half = fullHeight / 2;
    const leaned = leanBy(searchPress.x.get() - half, searchPress.y.get() - half, half, held);
    const pulled = {
      x: dragged.x * leaned.x,
      y: dragged.y * leaned.y,
      shiftX: dragged.shiftX + leaned.shiftX,
      shiftY: dragged.shiftY + leaned.shiftY,
    };
    return {
      transform: [
        { translateX: pulled.shiftX },
        { translateY: pulled.shiftY },
        { scaleX: searchScale.get() * pulled.x },
        { scaleY: searchScale.get() * pulled.y },
      ],
    };
  });

  // The bubble's contents shrink with the bar as it minimises, but iOS's magnifier barely does, so it undoes most of it.
  const searchGlyphStyle = useAnimatedStyle(() => {
    const bar = Math.max(scaleY.get(), 0.01);
    return {
      opacity: searchMode.get() > motion.backTravel.handoff ? 0 : 1,
      transform: [{ scale: (1 - layout.searchIconShrink * (1 - bar)) / bar }],
    };
  });
  const closeGlyphStyle = useAnimatedStyle(() => {
    const settled = clamp01(searchMode.get());
    const pop = clamp01(searchPop.get());
    return {
      opacity:
        modeTarget.get() === 1
          ? clamp01(searchMode.get() * 2 - 1)
          : clamp01((pop - motion.searchClose.glyphGone) / (1 - motion.searchClose.glyphGone)),
      transform: [
        {
          translateX: (-motion.searchPop.shift * (1 - pop) * settled) / Math.max(searchScale.get(), 0.01),
        },
        {
          scale: lerp(
            (modeTarget.get() === 0 ? motion.searchClose.glyphScale : motion.searchPop.glyphScale) /
              (1 + searchPress.press.get() * motion.pressGrow),
            1,
            modeTarget.get() === 0 ? pop * pop : pop,
          ),
        },
      ],
    };
  });

  return {
    barLiftStyle,
    closeGlyphStyle,
    keyboardReach,
    keyboardSpread,
    morphSearch,
    pillModeStyle,
    rowBlurProps,
    rowClipStyle,
    rowFit,
    rowFitStyle,
    rowUnclipStyle,
    searchCenter,
    searchContentStyle,
    searchFillStyle,
    searchGlyphStyle,
    searchInkStyle,
    searchScale,
    searchSpreadStyle,
    tileSink,
  };
};

export type SearchMorph = ReturnType<typeof useSearchMorph>;
