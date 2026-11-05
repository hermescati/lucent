import { Keyboard } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import { Easing, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { BarState } from './useBarState';
import type { SearchMorph } from './useSearchMorph';
import { setTabBarCollapsed } from '../context/collapse';
import { clamp01, inlinePad, modeInset, tick } from '../helpers/bar';
import { slotIndexAt } from '../helpers/slots';
import { motion } from '../tokens';

export interface BarActions {
  selectTab: (index: number, wait?: number) => void;
  reselect: (index: number) => void;
}

/** Tap, hold and drag on the bar, and the drag back from search into the tabs. */
export const useBarPress = (bar: BarState & SearchMorph & BarActions) => {
  const {
    backDragging,
    backIndex,
    backLight,
    barGrowth,
    barPress,
    barShiftX,
    barWidth,
    bounceAt,
    clampIndex,
    collapse,
    dent,
    disabledTabs,
    dragIndex,
    dragOrigin,
    dragRelease,
    dripShape,
    edgesReady,
    expandOnly,
    focused,
    glideFrom,
    glideSpan,
    glideTo,
    gliding,
    hasSearch,
    itemWidth,
    scaleX,
    slotPlan,
    jellyVelocity,
    landing,
    lensPosition,
    lensPresence,
    lift,
    modeTarget,
    moved,
    nudge,
    pillShiftX,
    poke,
    pokeSide,
    pressSquash,
    pressedAt,
    pressing,
    push,
    reselect,
    searchFocused,
    searchMode,
    searchPop,
    selectTab,
    settleAt,
    settleFill,
    settleOnArrival,
    settledIndex,
    sliding,
    tapDipping,
    tapGlow,
    tapSlide,
    tapStay,
  } = bar;

  const positionAt = (x: number) => {
    'worklet';
    // Back to the bar's own scale, then to the tab at that place (helpers/slots).
    const unscaled = barWidth.get() / 2 + (x - barWidth.get() / 2 - barShiftX.get()) / Math.max(scaleX.get(), 0.01);
    return clampIndex(slotIndexAt(slotPlan.get(), unscaled));
  };

  const startDrip = (amount = 1) => {
    'worklet';
    const kick = { ...motion.springs.dripKick, velocity: amount * motion.tapLanding.dripKick };
    dripShape.set(withDelay(motion.tapLanding.dripDelay, withSpring(0, kick)));
    landing.set(withSequence(withSpring(amount, motion.springs.landIn), withSpring(0, motion.springs.landOut)));
  };

  const pressBegin = (x: number) => {
    'worklet';
    const index = Math.round(positionAt(x));
    bounceAt.set(-1);
    if (index !== focused.get()) {
      scheduleOnRN(tick);
    }
    dragIndex.set(index);
    moved.set(false);
    const switching = index !== focused.get();
    tapStay.set(switching ? 0 : 1);
    pressedAt.set(Date.now());
    pressing.set(true);
    settleFill.set(withSpring(0, motion.springs.lift));
    settleOnArrival.set(false);
    // Pressed in place, the selected tab's lens is the dragged one from the start, lifted and let go however short the
    // press; a tap on another tab glides there first.
    if (switching) {
      tapSlide.set(1);
      tapSlide.set(withDelay(motion.tapSlide.holdDelay, withSpring(0, motion.springs.lift)));
    } else {
      tapSlide.set(0);
    }
    landing.set(switching ? withSpring(0, motion.springs.lift) : withSpring(1, motion.springs.pressRise));
    barPress.set(withSpring(1, motion.springs.barPressIn));
    barGrowth.set(withSpring(motion.barGrow.held, motion.springs.barGrowIn));
    dragRelease.set(0);
    settleAt.set(-1);
    lensPresence.set(withSpring(1, motion.springs.lift));
    pressSquash.set(withSequence(withSpring(1, motion.springs.track), withSpring(0, motion.springs.edgeSettle)));
    jellyVelocity.set(jellyVelocity.get() + motion.jelly.pressKick * (switching ? motion.switchTravel.pressKick : 1));
    if (switching) {
      lift.set(withSpring(1, motion.springs.lift));
    } else {
      // Tapped again while still up, it rises on from where it is, so each tap plays its whole lift and fall.
      tapGlow.set(withSpring(1, motion.springs.tapClear));
      tapDipping.set(false);
      lift.set(withSpring(1, motion.springs.pressRise));
    }
    gliding.set(switching);
    glideTo.set(index);
    glideSpan.set(Math.abs(index - lensPosition.get()));
    glideFrom.set(lensPosition.get());
    if (switching) {
      const distance = index - lensPosition.get();
      const extra = Math.max(0, Math.abs(distance) - 1);
      // From rest: it eases off, is fastest mid-way and eases into its tab over a long tail.
      const omega = motion.switchTravel.omega / (1 + motion.switchTravel.omegaPerSlot * extra);
      const travel = withSpring(index, {
        mass: 1,
        stiffness: omega * omega,
        damping: 2 * motion.switchTravel.damping * omega,
      });
      lensPosition.set(motion.switchTravel.delay > 0 ? withDelay(motion.switchTravel.delay, travel) : travel);
    } else {
      lensPosition.set(withSpring(index, motion.springs.lens));
    }
    dragOrigin.set(index);
    if (!switching) {
      const plan = slotPlan.get();
      const tabCenter =
        barWidth.get() / 2 + pillShiftX.get() + ((plan.centers[index] ?? 0) - barWidth.get() / 2) * scaleX.get();
      pokeSide.set(clamp01((x - tabCenter) / Math.max(itemWidth.get(), 1) + 0.5) * 2 - 1);
      poke.set(
        withSequence(
          withSpring(motion.poke.tap, motion.springs.pokeIn),
          withDelay(motion.poke.holdDelay, withSpring(1, motion.springs.pokeHold)),
        ),
      );
    }
  };

  const pressUpdate = (x: number, translationX: number) => {
    'worklet';
    if (!moved.get() && Math.abs(translationX) < motion.dragThreshold) {
      return;
    }
    moved.set(true);
    tapGlow.set(0);
    poke.set(withSpring(0, motion.springs.pokeHold));
    gliding.set(false);
    tapSlide.set(withSpring(0, motion.springs.lift));
    sliding.set(false);
    settleOnArrival.set(false);
    barPress.set(withSpring(1, motion.springs.barPressIn));
    barGrowth.set(withSpring(motion.barGrow.held, motion.springs.barGrowIn));
    const width = barWidth.get();
    const inner = x < inlinePad ? x - inlinePad : x > width - inlinePad ? x - (width - inlinePad) : 0;
    const rubber = Math.sign(inner) * motion.nudgeMax * (1 - 1 / (1 + Math.abs(inner) / motion.nudgeRange));
    const follow = width > 0 ? ((x - width / 2) / (width / 2)) * motion.nudgeFollow : 0;
    nudge.set(withSpring(rubber + follow, motion.springs.track));
    const position = positionAt(x);
    const plan = slotPlan.get();
    const lastCenter = plan.centers[plan.centers.length - 1] ?? barWidth.get();
    const lastHalf = (plan.widths[plan.widths.length - 1] ?? 0) / 2;
    const pushTarget = hasSearch ? clamp01((x - lastCenter) / Math.max(lastHalf, 1)) : 0;
    push.set(withSpring(pushTarget, motion.springs.track));
    lensPosition.set(withSpring(position, motion.springs.track));
    const index = Math.round(position);
    if (index !== dragIndex.get()) {
      dragIndex.set(index);
      scheduleOnRN(tick);
    }
  };

  const pressEnd = (canceled: boolean) => {
    'worklet';
    pressing.set(false);
    poke.set(withSpring(0, motion.springs.pokeOut));
    const committed = !canceled || !moved.get();
    const pressTime = Date.now() - pressedAt.get();
    const linger = gliding.get() ? motion.switchTravel.lingerPerSlot * Math.max(0, glideSpan.get() - 1) : 0;
    const picked = dragIndex.get();
    const blocked = committed && picked >= 0 && (disabledTabs.get()[picked] ?? false);
    const index = committed && !blocked ? picked : focused.get();
    // Dragged, it fills once it lands (useLensPhysics), not as the finger lifts.
    if (!(moved.get() && index >= 0)) {
      settleFill.set(
        withDelay(
          Math.max(0, motion.switchTravel.fillDelay + linger - pressTime),
          withSpring(1, motion.springs.settleFill),
        ),
      );
    }
    if (blocked) {
      gliding.set(false);
    }
    dragIndex.set(-1);
    push.set(withSpring(0, motion.springs.release));
    nudge.set(withSpring(0, motion.springs.edgeSettle));
    const settle = withSpring(0, motion.springs.release);
    const inPlace = !moved.get() && !gliding.get() && tapStay.get() === 1;
    const quick = !moved.get() && (inPlace ? pressTime < motion.tapSlide.holdDelay : tapSlide.get() > 0.5);
    const tapping = quick && sliding.get() && !blocked;
    const pressed = !moved.get() && !quick && tapStay.get() === 1;
    const pressSwitch = !moved.get() && !quick && gliding.get();
    if ((quick || pressSwitch) && !inPlace) {
      tapSlide.set(withSpring(1, motion.springs.lift));
    }
    if (tapping) {
      settleOnArrival.set(true);
    } else if (moved.get() && index >= 0) {
      dragRelease.set(1);
      settleAt.set(index);
      landing.set(withSpring(0, motion.springs.landOut));
    } else {
      const rise = withSpring(1, motion.springs.tapRise);
      const dipping = tapDipping.get() && lift.get() > motion.tapLens.dipFrom;
      const strength =
        quick && !dipping && !inPlace
          ? clamp01((pressTime - motion.tapLens.dentFrom) / (motion.tapLens.dentFull - motion.tapLens.dentFrom))
          : 0;
      dent.set(strength);
      const dripNow = strength > 0 && !gliding.get();
      tapGlow.set(
        quick && strength < 1 && !gliding.get() && tapStay.get() === 1
          ? // Clear until a set time from touch-down, however short the tap, then darkening back.
            withDelay(Math.max(0, motion.tapLens.glowHold - pressTime), withSpring(0, motion.springs.tapGlowOut))
          : 0,
      );
      if (dripNow) {
        startDrip(strength);
      } else {
        dripShape.set(0);
        // A quick tap's lens stays clear with its glow and darkens back with it; a held one's when let go.
        landing.set(
          quick
            ? withDelay(Math.max(0, motion.tapLens.glowHold - pressTime), withSpring(0, motion.springs.tapGlowOut))
            : withSpring(0, motion.springs.landOut),
        );
      }
      lift.set(
        pressSwitch
          ? settle
          : quick || pressed
            ? dipping
              ? withSequence(withSpring(motion.tapLens.dip, motion.springs.tapDip), rise, settle)
              : gliding.get()
                ? withSequence(
                    // Timed, not sprung: a spring's tail toward 1 held the fall back a few hundred ms.
                    withTiming(1, { duration: motion.switchTravel.rise, easing: Easing.out(Easing.quad) }),
                    withDelay(
                      Math.max(0, motion.switchTravel.liftFor - pressTime - motion.switchTravel.rise) + linger,
                      withSpring(0, motion.switchTravel.fall),
                    ),
                  )
                : quick
                  ? // A quick tap's rise carries on untouched, and it settles from the same moment however short it
                    // was, springing on from its pace so the lift and the settle are one movement.
                    withDelay(Math.max(0, motion.tapLens.peakAt - pressTime), withSpring(0, motion.springs.tapSettleIn))
                  : withSpring(0, motion.springs.pressFall)
            : settle,
      );
      tapDipping.set(false);
    }
    // Let go mid-drag, the bar stays swollen until the lens lands (useLensPhysics), as iOS 27's takes its impact.
    // A quick tap on the selected tab keeps the bar's glass lit while its lens is up, and lets its swell go slowly.
    if (!(moved.get() && index >= 0)) {
      const tapped = quick && tapStay.get() === 1 && !gliding.get();
      const stay = tapped ? Math.max(0, motion.tapLens.glowHold - pressTime) : 0;
      barPress.set(withDelay(stay, withSpring(0, motion.springs.barPressOut)));
      barGrowth.set(withSpring(0, tapped ? motion.springs.tapSwellOut : motion.springs.barPressOut));
    }
    if (index >= 0) {
      const bounce = blocked && !moved.get() ? pressedAt.get() + motion.disabledBounce.delay : -1;
      if (bounce > Date.now()) {
        bounceAt.set(bounce);
      } else if (!tapping && !(gliding.get() && index === glideTo.get())) {
        // Let go mid-drag, it carries on with the finger's speed a little past its tab and back.
        lensPosition.set(withSpring(index, moved.get() ? motion.springs.dragLand : motion.springs.lens));
      }
      settledIndex.set(index);
      if (committed && index !== focused.get()) {
        scheduleOnRN(selectTab, index, moved.get() ? 0 : Math.max(0, motion.switchTravel.navigateDelay - pressTime));
      } else if (committed && !blocked && !moved.get() && index === focused.get()) {
        scheduleOnRN(reselect, index);
      } else if (focused.get() < 0) {
        lensPresence.set(withSpring(0, motion.springs.morph));
      }
    }
  };

  const pan = usePanGesture({
    enabled: !searchFocused,
    minDistance: 0,
    onBegin: (event) => {
      if (collapse && collapse.target.get() === 1) {
        expandOnly.set(true);
        setTabBarCollapsed(collapse, 0);
        return;
      }
      pressBegin(event.x);
    },
    onUpdate: (event) => {
      if (expandOnly.get()) {
        return;
      }
      pressUpdate(event.x, event.translationX);
    },
    onFinalize: (event) => {
      if (expandOnly.get()) {
        expandOnly.set(false);
        return;
      }
      pressEnd(event.canceled);
    },
  });

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const backDrag = usePanGesture({
    enabled: searchFocused,
    minDistance: motion.searchDrag.start,
    onActivate: (event) => {
      const x = modeInset + event.x;
      const index = Math.round(positionAt(x));
      backDragging.set(true);
      lensPosition.set(index);
      focused.set(disabledTabs.get()[index] ? backIndex : index);
      edgesReady.set(false);
      backLight.set(0);
      modeTarget.set(0);
      searchPop.set(withSpring(0, motion.springs.searchDrag));
      searchMode.set(withSpring(0, motion.springs.searchDrag));
      scheduleOnRN(dismissKeyboard);
      pressBegin(x);
      pressUpdate(x, motion.dragThreshold + 1);
    },
    onUpdate: (event) => {
      if (backDragging.get()) {
        pressUpdate(modeInset + event.x, event.translationX);
      }
    },
    onFinalize: () => {
      if (!backDragging.get()) {
        return;
      }
      backDragging.set(false);
      const index = dragIndex.get();
      const blocked = index >= 0 && (disabledTabs.get()[index] ?? false);
      const selected = index !== focused.get();
      const target = blocked ? focused.get() : index;
      pressEnd(false);
      if ((blocked || !selected) && target >= 0) {
        scheduleOnRN(selectTab, target);
      }
    },
  });

  return { backDrag, pan, startDrip };
};

export type BarPress = ReturnType<typeof useBarPress>;
