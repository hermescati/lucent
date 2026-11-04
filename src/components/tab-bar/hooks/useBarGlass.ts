import { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';

import { glass } from '../../../theme/tokens';
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
} from '../helpers/bar';

/** The bar's glass shapes (tabs pill, search circle and field) and its press growth. */
export const useBarGlass = (bar: BarState & SearchMorph & LensStyles) => {
  const {
    backBump,
    backLight,
    backPress,
    barGrowth,
    barPress,
    barWidth,
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
    squish,
    tapSlide,
    tapStay,
    tileSink,
    towardSearch,
    wallSide,
  } = bar;

  const barGlassProps = useAnimatedProps(() => {
    const width = barWidth.get();
    if (width <= 0) {
      return {
        shapes: [] as number[],
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
    const frostCenter = inlinePad + layout.bubbleRestWidth / 2 + lensGeometry.get().translateX;
    const frostRideEnd = modeInset + (modeHeight / width) * frostCenter;
    const frostX = fit.x + frostCenter * fit.scale - (frostRideEnd - modeInset - modeHeight / 2) * ride;
    const frostY = fullHeight / 2 + lensGeometry.get().translateY;
    const frostShrink = lerp(1, modeHeight / lensFullHeight, ride);
    const frostHalfX = ((layout.bubbleRestWidth * lensGeometry.get().scaleX) / 2) * frostShrink;
    const frostHalfY = ((lensFullHeight * lensGeometry.get().scaleY) / 2) * frostShrink;

    const growX = barGrowth.get() * motion.barGrow.x * (1 - settled);
    const grow = barGrowth.get() * motion.barGrow.y * (1 - settled);
    const wallBulge = gliding.get() ? 0 : Math.max(0, squish.get()) * motion.squish.barBulge * (1 - settled);
    const pillLeft =
      pillShiftX.get() + (width - width * scaleX.get()) / 2 - growX - (wallSide.get() < 0 ? wallBulge : 0);
    const pillRight =
      pillLeft +
      width * scaleX.get() +
      growX * (1 + towardSearch) +
      (wallSide.get() < 0 ? wallBulge : 0) +
      (wallSide.get() > 0 ? wallBulge : 0);
    const pillInset = (fullHeight * (1 - scaleY.get())) / 2;
    const pillTop = pillInset - grow;
    const backGrow = modeRadius * motion.pressGrow * backPress.press.get() * settled;
    const backLeft = lerp(pillLeft, pillLeft + modeInset, settled) - backGrow;
    const bump = searchBump.get();
    const backRight =
      lerp(pillRight, pillLeft + modeInset + modeHeight, settled) +
      backGrow +
      bump * motion.searchBump.overshoot -
      backBump.get() * motion.searchBump.squish;
    const backTop = lerp(pillTop, modeInset, settledY) - backGrow;
    const backBottom = lerp(fullHeight - pillInset + grow, fullHeight - modeInset, settledY) + backGrow;
    const spread = keyboardSpread.get();
    const sink = tileSink.get();
    const dip = searchDip.get();
    const backSpread = modeTarget.get() === 0 && mode > 0 ? backLight.get() * Math.pow(settled, glass.backGlowFade) : 0;

    const searchX = width + layout.tabBarGap + fullHeight / 2;
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
    const fieldTop = lerp(circleY - searchRadius, modeInset, settledY);
    const fieldBottom = lerp(circleY + searchRadius, fullHeight - modeInset, settledY);
    const tucked =
      settled > 0 ? Math.min(circleRadius, ((fieldBottom - fieldTop) / 2) * motion.searchPop.tuckScale) : circleRadius;
    const fieldRadius = lerp(tucked, circleRadius, popPlace);
    // Held by its clear button, the field swells about its middle.
    const held = fieldPress.press.get() * settled;
    const fieldGrow = held * motion.fieldPressGrow;
    const fieldGrowX = ((fieldRight - fieldLeft) * fieldGrow) / 2;
    const fieldGrowY = ((fieldBottom - fieldTop) * fieldGrow) / 2;

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
        grey.get() *
        (1 - clamp01(collapsed.get() * motion.labelFadeRate)) *
        (modeTarget.get() === 0
          ? clamp01((motion.searchClose.fillFrom - mode) / (motion.searchClose.fillFrom - motion.searchClose.fillTo))
          : 1),
      frostClear: glass.lensFrostClear[scheme],
      frostRadius: glass.lensFrostRadius[scheme],
      frostMagnify: glass.lensFrostMagnify[scheme],
      frostLeft: frostX - frostHalfX + pad,
      frostRight: frostX + frostHalfX + pad,
      frostTop: frostY - frostHalfY + pad,
      frostBottom: frostY + frostHalfY + pad,
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
          : {
              glowX: (leftEdge.get() + rightEdge.get()) / 2 + pad,
              glowY: fullHeight / 2 + pad,
              glowSpread: glass.pressGlowSpread,
              glowStrength: glass.pressGlow * shine.get() * barPress.get() * (1 - tapSlide.get()) * (1 - settled),
              glowShape: -1,
            }),
      wideMix: lerp(glass.wideMix[scheme], glass.pressWideMix[scheme], barPress.get() * (1 - settled)),
      shapes: [
        backLeft + pad,
        backTop + sink + pad,
        backRight + pad,
        backBottom + sink + pad,
        ...(hasSearch
          ? [
              circleX - fieldRadius + bump * motion.searchBump.squish + pad,
              circleY - fieldRadius + dip + pad,
              circleX + fieldRadius + pad,
              circleY + fieldRadius + dip + pad,
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

  const pressScaleStyle = useAnimatedStyle(() => {
    const width = Math.max(barWidth.get(), 1);
    const growX = barGrowth.get() * motion.barGrow.x * (1 - clamp01(searchMode.get()));
    return {
      transform: [
        { translateY: tileSink.get() },
        { translateX: (-growX * (1 - towardSearch)) / 2 },
        { scale: 1 + (growX * (1 + towardSearch)) / width },
      ],
    };
  });

  const pillLiftStyle = useAnimatedStyle(() => {
    const width = Math.max(barWidth.get(), 1);
    const open = 1 - clamp01(searchMode.get());
    const growX = barGrowth.get() * motion.barGrow.x * open;
    const growY = barGrowth.get() * motion.barGrow.y * open;
    return {
      opacity: shine.get() * lerp(1, barPress.get(), tapStay.get()) * open,
      transform: [
        { translateX: (growX * (towardSearch - 1)) / 2 },
        { scaleX: 1 + (growX * (1 + towardSearch)) / width },
        { scaleY: 1 + (growY * 2) / fullHeight },
      ],
    };
  });

  return { barGlassProps, pillLiftStyle, pressScaleStyle };
};
