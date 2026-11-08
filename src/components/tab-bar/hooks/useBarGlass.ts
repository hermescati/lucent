import { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';

import { glassPress } from '../../../core/glass/presets';
import { leanBy } from '../../../core/glass/useShapePress';
import { barItemMotion } from '../../../core/motion/island';
import { useSolidGlass } from '../../../theme/solid';
import { glass } from '../../../theme/tokens';
import { pillWidthAt, slotCenterAt } from '../helpers/slots';
import { layout, motion } from '../tokens';
import type { BarState } from './useBarState';
import type { LensStyles } from './useLensStyles';
import type { SearchMorph } from './useSearchMorph';
import {
  clamp01,
  fullHeight,
  inlinePad,
  lensFullHeight,
  lerp,
  modeHeight,
  modeInset,
  modeRadius,
  pullBy,
} from '../helpers/bar';

/** The bar's glass shapes (tabs pill, search circle and field) and its press growth. */
export const useBarGlass = (bar: BarState & SearchMorph & LensStyles) => {
  const {
    lensBase,
    backBump,
    backLight,
    backPress,
    barGrowth,
    barPress,
    barWidth,
    frameWidth,
    fieldFit,
    swell,
    circleCenter,
    collapsed,
    gliding,
    grey,
    hasSearch,
    keyboardSpread,
    lastIndex,
    leftEdge,
    lensGeometry,
    lensPosition,
    lensPresence,
    lensPull,
    lift,
    minimizedPress,
    modeTarget,
    pillShiftX,
    push,
    rightEdge,
    rowFit,
    scaleX,
    scaleY,
    scheme,
    searchBump,
    searchDip,
    searchMode,
    searchPop,
    fieldPress,
    searchIdle,
    searchPress,
    searchRaise,
    searchScale,
    shine,
    slotPlan,
    squish,
    tapSlide,
    tapStay,
    tileSink,
    towardSearch,
    searchApart,
    wallSide,
  } = bar;
  // Solid, the pill is the bar's own, kept inside it: no lens lifts out of the bar, and the pill stays as it glides,
  // stretches and presses, at its resting height (One UI's pill never leaves its bar).
  const solid = useSolidGlass();
  // Nor does the bar swell under a finger, or bulge where the lens pushes its end: it keeps its size. (barGrowth is
  // read in each worklet itself, which a helper's read wouldn't make it track.)
  // The resting pill's margin inside the bar, above and below it.
  const solidMargin = (fullHeight - layout.bubbleRestHeight) / 2;

  const barGlassProps = useAnimatedProps(() => {
    const width = frameWidth.get();
    if (width <= 0) {
      return {
        shapes: [] as number[],
        shapePull: [-1, 1, 1],
        blend: 0,
        dim: 0,
        glowX: 0,
        glowY: 0,
        glowSpread: 0,
        glowStrength: 0,
        frost: 0,
        frostClear: 0,
        frostRadius: 0,
        frostLeft: 0,
        frostTop: 0,
        frostRight: 0,
        frostBottom: 0,
        wideMix: glass.wideMix[scheme] as number,
      };
    }
    const mode = searchMode.get();
    const settled = clamp01(mode);
    const settledY = Math.pow(settled, motion.searchMorph.heightLag);
    const pop = searchPop.get();
    const popPlace = clamp01(pop);
    const pad = glass.pad;
    const fit = rowFit.get();
    const ride = modeTarget.get() === 0 ? settled : 0;
    // Solid, the pill keeps its resting shape, its tab's own width at its resting height, and slides from tab to tab
    // with the lens's position, without the lens's stretch, squash or lean (helpers/slots, as useLensPhysics places it).
    const plan = slotPlan.get();
    const position = lensPosition.get();
    const frostCenter = solid
      ? barWidth.get() / 2 + pillShiftX.get() + (slotCenterAt(plan, position) - barWidth.get() / 2) * scaleX.get()
      : inlinePad + lensBase.get() / 2 + lensGeometry.get().translateX;
    const frostRideEnd = modeInset + (modeHeight / width) * frostCenter;
    const frostX = fit.x + frostCenter * fit.scale - (frostRideEnd - modeInset - modeHeight / 2) * ride;
    const frostY = fullHeight / 2 + (solid ? 0 : lensGeometry.get().translateY);
    const frostShrink = lerp(1, modeHeight / lensFullHeight, ride);
    const frostHalfX =
      ((solid
        ? pillWidthAt(plan, position, layout.tabSpacing.outset) * scaleX.get()
        : lensBase.get() * lensGeometry.get().scaleX) /
        2) *
      frostShrink;
    const frostHalfY =
      ((solid ? layout.bubbleRestHeight * scaleY.get() : lensFullHeight * lensGeometry.get().scaleY) / 2) * frostShrink;

    // As a tab comes or goes, the bar swells and settles as an island does (BarCapsule's swellBy): 17% taller, and wider
    // by swellX at each end.
    const swelling = swell.get() * (1 - settled);
    const growX = (solid ? 0 : barGrowth.get()) * motion.barGrow.x * (1 - settled) + barItemMotion.swellX * swelling;
    const grow =
      (solid ? 0 : barGrowth.get()) * motion.barGrow.y * (1 - settled) +
      (fullHeight * barItemMotion.swellY * swelling) / 2;
    const wallBulge = solid || gliding.get() ? 0 : Math.max(0, squish.get()) * motion.squish.barBulge * (1 - settled);
    // A lens held above or below the bar draws its near edge after the finger and narrows it a little, as iOS 27's.
    const lensHeld = (solid ? 0 : lift.get()) * (1 - settled) * lensPull.get();
    const heldNarrow = Math.abs(lensHeld) * motion.pull.bar.narrow;
    // Above (negative), the top is the near edge; below, the bottom.
    const heldUp = -Math.min(lensHeld, 0);
    const heldDown = Math.max(lensHeld, 0);
    const pillLeft =
      pillShiftX.get() + (width - width * scaleX.get()) / 2 - growX - (wallSide.get() < 0 ? wallBulge : 0) + heldNarrow;
    const pillRight =
      pillLeft +
      width * scaleX.get() +
      growX * (1 + towardSearch) +
      (wallSide.get() < 0 ? wallBulge : 0) +
      (wallSide.get() > 0 ? wallBulge : 0) -
      heldNarrow * 2;
    const pillInset = (fullHeight * (1 - scaleY.get())) / 2;
    // Held while minimized, it swells about its middle by as much as any pressed glass shape grows (glassPress.grow:
    // iOS 27's goes from 49 to 65pt); search's circle beside it doesn't.
    const minimizedHeld = solid ? 0 : minimizedPress.press.get() * collapsed.get();
    const swellBy = (minimizedHeld * glassPress.grow) / 2;
    const pillTop = pillInset - grow - heldUp * motion.pull.bar.near + heldDown * motion.pull.bar.far - swellBy;
    const pillBottom =
      fullHeight - pillInset + grow - heldUp * motion.pull.bar.far + heldDown * motion.pull.bar.near + swellBy;
    const backGrow = modeRadius * motion.pressGrow * backPress.press.get() * settled;
    const backLeft = lerp(pillLeft, pillLeft + modeInset, settled) - backGrow - swellBy;
    const bump = searchBump.get();
    const backRight =
      lerp(pillRight, pillLeft + modeInset + modeHeight, settled) +
      backGrow +
      swellBy +
      bump * motion.searchBump.overshoot -
      backBump.get() * motion.searchBump.squish;
    // At larger text the field reaches above its row (helpers/bar searchFieldFit), and its circles rise to its middle.
    const rise = fieldFit.rise * settledY;
    const backTop = lerp(pillTop, modeInset, settledY) - rise / 2 - backGrow;
    const backBottom = lerp(pillBottom, fullHeight - modeInset, settledY) - rise / 2 + backGrow;
    const spread = keyboardSpread.get();
    const sink = tileSink.get();
    const dip = searchDip.get();
    const backSpread = modeTarget.get() === 0 && mode > 0 ? backLight.get() * Math.pow(settled, glass.backGlowFade) : 0;

    const searchX = circleCenter;
    const circleY = fullHeight / 2;
    const searchRadius = (fullHeight / 2) * searchScale.get();
    // Inactive, the field reaches all the way to where the close button's circle ended.
    const fieldEnd = searchX + searchRadius - motion.searchPop.shift * settled * (1 - searchIdle.get()) + spread;
    const circleX = lerp(searchX, lerp(searchX - motion.searchPop.shift, searchX, popPlace), settled) + spread;
    const hiddenScale = modeTarget.get() === 0 ? motion.searchClose.circleScale : motion.searchPop.hiddenScale;
    const circleRadius =
      modeTarget.get() === 0
        ? lerp(
            searchRadius,
            lerp(searchRadius * hiddenScale, searchRadius, pop * pop),
            clamp01(settled * motion.searchClose.circleHold),
          )
        : lerp(searchRadius, lerp(searchRadius * hiddenScale, searchRadius, pop), settled);

    const fieldStart =
      lerp(pillLeft + modeInset + modeHeight + layout.searchModeGap, pillLeft + modeInset, clamp01(searchRaise.get())) -
      spread;
    const fieldLeft = lerp(searchX - searchRadius, fieldStart, settled);
    const fieldRight = lerp(fieldEnd, searchX - modeRadius - layout.searchModeGap + spread, popPlace);
    const fieldTop = lerp(circleY - searchRadius, modeInset, settledY) - rise;
    const fieldBottom = lerp(circleY + searchRadius, fullHeight - modeInset, settledY);
    const tucked =
      settled > 0 ? Math.min(circleRadius, ((fieldBottom - fieldTop) / 2) * motion.searchPop.tuckScale) : circleRadius;
    const fieldRadius = lerp(tucked, circleRadius, popPlace);
    // Set apart or melting back: the circle travels between the bar's end and its own place, growing as it leaves.
    const apart = searchApart.get();
    // Held and dragged off, the circle pulls after the finger, stretched as a whole (`shapePull`, a circle into an
    // ellipse) about a middle that follows it.
    // Held, it also leans toward the finger on it, as every pressed glass shape does (useShapePress).
    const circleHeld = (solid ? 0 : searchPress.press.get()) * (1 - settled);
    const dragged = pullBy(searchPress.pull.get(), circleHeld, motion.pull.circle);
    const half = fullHeight / 2;
    const leaned = leanBy(searchPress.x.get() - half, searchPress.y.get() - half, half, circleHeld);
    const pulled = {
      x: dragged.x * leaned.x,
      y: dragged.y * leaned.y,
      shiftX: dragged.shiftX + leaned.shiftX,
      shiftY: dragged.shiftY + leaned.shiftY,
    };
    const splitX = lerp(width - fullHeight / 2, circleX, apart) + pulled.shiftX * apart;
    const splitRadius = fieldRadius * lerp(motion.searchSplit.from, 1, clamp01(apart));
    // Held by its clear button, the field swells about its middle.
    const held = fieldPress.press.get() * settled;
    const fieldGrow = held * motion.fieldPressGrow;
    const fieldGrowX = ((fieldRight - fieldLeft) * fieldGrow) / 2;
    const fieldGrowY = ((fieldBottom - fieldTop) * fieldGrow) / 2;

    const solidX = Math.min(
      Math.max(frostX, backLeft + solidMargin + frostHalfX),
      Math.max(backLeft + solidMargin + frostHalfX, backRight - solidMargin - frostHalfX),
    );

    return {
      blend: Math.max(
        glass.blend * clamp01(mode * 3),
        glass.popBlend * Math.sin(Math.PI * popPlace) * settled,
        glass.liftBlend *
          clamp01(barGrowth.get() / motion.barGrow.held) ** 2 *
          (1 - settled) *
          (1 -
            clamp01(1 - (lastIndex - lensPosition.get()) / glass.lensPinchSideReach) *
              (1 - lerp(motion.endMelt, 1, push.get()))),
        glass.pressBlend * searchPress.press.get(),
        motion.searchSplit.blend * Math.sin(Math.PI * clamp01(apart)),
        (hasSearch ? glass.meltBlend : 0) *
          shine.get() *
          (1 - settled) *
          clamp01(1 - (lastIndex - lensPosition.get()) / glass.lensPinchSideReach) *
          lerp(motion.endMelt, 1, push.get()),
      ),
      dim: 0,
      frost:
        glass.lensFrost *
        lensPresence.get() *
        (solid ? 1 : grey.get()) *
        (1 - clamp01(collapsed.get() * motion.labelFadeRate)) *
        (modeTarget.get() === 0
          ? clamp01((motion.searchClose.fillFrom - mode) / (motion.searchClose.fillFrom - motion.searchClose.fillTo))
          : 1),
      frostClear: glass.lensFrostClear[scheme],
      frostRadius: glass.lensFrostRadius[scheme],
      frostMagnify: glass.lensFrostMagnify[scheme],
      ...(solid
        ? {
            // Solid, the pill never leaves the bar: carried past an end, it stops at its resting margin there.
            frostLeft: solidX - frostHalfX + pad,
            frostRight: solidX + frostHalfX + pad,
            frostTop: frostY - frostHalfY + pad,
            frostBottom: frostY + frostHalfY + pad,
          }
        : {
            frostLeft: frostX - frostHalfX + pad,
            frostRight: frostX + frostHalfX + pad,
            frostTop: frostY - frostHalfY + pad,
            frostBottom: frostY + frostHalfY + pad,
          }),
      ...(held > 0
        ? {
            glowX: (fieldLeft + fieldRight) / 2 + pad,
            glowY: (fieldTop + fieldBottom) / 2 + dip + pad,
            glowSpread: fieldRight - fieldLeft,
            glowStrength: motion.fieldPressGlow * held,
            // The field's shape: after the tabs' pill and the search circle.
            glowShape: 2,
          }
        : backSpread > 0
          ? {
              glowX: backLeft + modeHeight / 2 + pad,
              glowY: (backTop + backBottom) / 2 + pad,
              glowSpread: (backRight - backLeft) * glass.backGlowSpread,
              glowStrength: glass.backGlow[scheme] * backSpread,
              glowShape: -1,
            }
          : minimizedHeld > 0
            ? {
                // Held while minimized, it lights up as a pressed glass button does (useShapePress).
                glowX: (backLeft + backRight) / 2 + pad,
                glowY: (backTop + backBottom) / 2 + pad,
                glowSpread: glassPress.glowSpread,
                glowStrength: glassPress.glow * minimizedPress.glow.get() * collapsed.get(),
                glowShape: -1,
              }
            : {
                glowX: (leftEdge.get() + rightEdge.get()) / 2 + pad,
                glowY: fullHeight / 2 + pad,
                glowSpread: glass.pressGlowSpread,
                glowStrength: glass.pressGlow * shine.get() * barPress.get() * (1 - tapSlide.get()) * (1 - settled),
                glowShape: -1,
              }),
      wideMix: lerp(glass.wideMix[scheme], glass.pressWideMix[scheme], barPress.get() * (1 - settled)),
      shapePull: apart > 0.002 && (pulled.x !== 1 || pulled.y !== 1) ? [1, pulled.x, pulled.y] : [-1, 1, 1],
      shapes: [
        backLeft + pad,
        backTop + sink + pad,
        backRight + pad,
        backBottom + sink + pad,
        ...(apart > 0.002
          ? [
              splitX - splitRadius + bump * motion.searchBump.squish + pad,
              circleY - rise / 2 - splitRadius + dip + pulled.shiftY * apart + pad,
              splitX + splitRadius + pad,
              circleY - rise / 2 + splitRadius + dip + pulled.shiftY * apart + pad,
            ]
          : []),
        ...(mode > 0
          ? [
              fieldLeft - fieldGrowX + bump * motion.searchBump.squish + pad,
              fieldTop - fieldGrowY + dip + pad,
              fieldRight + fieldGrowX + pad,
              fieldBottom + fieldGrowY + dip + pad,
            ]
          : []),
      ],
    };
  });

  // What's in the bar goes with it while a lens held above or below pulls it (barGlassProps): up or down with its middle,
  // drawn in with its ends. Read here, not in a helper, so the styles track it.
  const pressScaleStyle = useAnimatedStyle(() => {
    const width = Math.max(barWidth.get(), 1);
    const open = 1 - clamp01(searchMode.get());
    const growX = (solid ? 0 : barGrowth.get()) * motion.barGrow.x * open;
    const held = (solid ? 0 : lift.get()) * open * lensPull.get();
    const { near, far, narrow } = motion.pull.bar;
    return {
      transform: [
        { translateY: tileSink.get() + (held * (near + far)) / 2 },
        { translateX: (-growX * (1 - towardSearch)) / 2 },
        { scaleX: (1 + (growX * (1 + towardSearch)) / width) * (1 - (2 * Math.abs(held) * narrow) / width) },
        { scaleY: 1 + (growX * (1 + towardSearch)) / width },
      ],
    };
  });

  const pillLiftStyle = useAnimatedStyle(() => {
    const width = Math.max(barWidth.get(), 1);
    const open = 1 - clamp01(searchMode.get());
    const growX = (solid ? 0 : barGrowth.get()) * motion.barGrow.x * open;
    const growY = (solid ? 0 : barGrowth.get()) * motion.barGrow.y * open;
    // Pulled with the bar's glass, or it shows as a band where the glass has moved on (barGlassProps).
    const held = (solid ? 0 : lift.get()) * open * lensPull.get();
    const { near, far, narrow } = motion.pull.bar;
    return {
      opacity: shine.get() * lerp(1, barPress.get(), tapStay.get()) * open,
      transform: [
        { translateX: (growX * (towardSearch - 1)) / 2 },
        { translateY: (held * (near + far)) / 2 },
        { scaleX: (1 + (growX * (1 + towardSearch)) / width) * (1 - (2 * Math.abs(held) * narrow) / width) },
        { scaleY: 1 + (growY * 2 + Math.abs(held) * (near - far)) / fullHeight },
      ],
    };
  });

  return { barGlassProps, pillLiftStyle, pressScaleStyle };
};
