import {
  interpolateColor,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import { glass } from '../../../theme/tokens';
import { clamp01, fullHeight, inlinePad, lensCompactScaleY, lensFullHeight, lerp } from '../helpers/bar';
import { layout, motion } from '../tokens';
import type { BarState } from './useBarState';

/** The lens's shape, fill, glass optics and how much it covers each tab icon. */
export const useLensStyles = (bar: BarState) => {
  const {
    lensBase,
    barWidth,
    collapsed,
    color,
    dragOrigin,
    dragRelease,
    dripShape,
    edgesReady,
    glideFrom,
    glideSpan,
    gliding,
    heading,
    held,
    holding,
    itemWidth,
    scaleX,
    slotPlan,
    jelly,
    landing,
    lastIndex,
    leftEdge,
    lensPosition,
    lensPresence,
    lift,
    moved,
    moving,
    pillShiftX,
    poke,
    pokeSide,
    pressSquash,
    push,
    restSpan,
    rightEdge,
    scheme,
    settleFill,
    slideFrom,
    slideRight,
    slideShape,
    slideTo,
    sliding,
    squish,
    tabs,
    tapGlow,
    tapSlide,
    tapStay,
    wallSide,
  } = bar;

  const deflate = useDerivedValue(() => {
    const travel = clamp01(
      (Math.abs(lensPosition.get() - dragOrigin.get()) - motion.deflateTravel) / motion.deflateRamp,
    );
    const fast = clamp01((moving.get() - motion.deflateSpeed) / (1 - motion.deflateSpeed));
    return fast * travel * lift.get();
  });

  const lensGeometry = useDerivedValue(() => {
    const fullWidth = lensBase.get();
    const left = leftEdge.get();
    const right = rightEdge.get();
    const span = Math.max(0, right - left);
    const barScale = fullHeight / lensFullHeight;
    const slide = slideShape.get();
    const liftScale = lerp(
      lerp(
        layout.bubbleRestHeight / lensFullHeight,
        lerp(
          lerp(
            motion.lensLift.y,
            lerp(moved.get() ? motion.lensLift.y : motion.tapLens.holdLiftY, motion.tapLens.liftY, tapSlide.get()),
            tapStay.get(),
          ),
          (fullHeight * motion.switchTravel.height) / lensFullHeight,
          tapSlide.get() * (1 - tapStay.get()),
        ),
        lift.get(),
      ),
      barScale,
      deflate.get(),
    );
    const minScaleY = lerp(layout.bubbleRestHeight / lensFullHeight, barScale, lift.get()) * (1 - slide);
    const rest = restSpan.get();
    const stretchRatio = rest > 0 ? span / rest : 1;
    const floor = lerp(motion.minLensSquash, motion.tapSlide.minSquash, slide);
    const travel = slideTo.get() - slideFrom.get();
    const lead = slideRight.get() ? right : left;
    const arrived = Math.abs(travel) > 0.5 ? clamp01((lead - slideFrom.get()) / travel) : 1;
    const thinning = lerp(0.5, arrived * arrived, slide);
    const squash = Math.min(1 / floor, Math.max(floor, Math.pow(Math.max(stretchRatio, 0.01), -thinning)));
    const compact = lerp(1, lensCompactScaleY, collapsed.get());
    const base = compact * Math.max(minScaleY, liftScale * squash * (1 - pressSquash.get() * motion.pressSquashY));
    const wobble = 1 + jelly.get() * lerp(1, motion.tapSlide.jellyX, slide);
    let scaleY = base * (1 + squish.get() * (gliding.get() ? motion.switchTravel.squishBulge : motion.squish.bulge));
    let scaleX =
      (fullWidth > 0 ? Math.max(span / fullWidth, 0.01) : 1) *
      (1 + pressSquash.get() * motion.pressSquashX) *
      wobble *
      (1 - squish.get());
    const wall = Math.max(base, (compact * (fullHeight + motion.canal.overflow)) / lensFullHeight);
    if (scaleY > wall) {
      const excess = scaleY - wall;
      scaleY = wall + excess * motion.canal.give;
      scaleX +=
        excess *
        (1 - motion.canal.give) *
        lerp(motion.canal.spread, motion.tapSlide.wallSpread, slide) *
        (lensFullHeight / fullWidth);
    }
    if (gliding.get()) {
      const knee = (fullHeight * motion.switchTravel.height) / lensFullHeight;
      const cap = (fullHeight - 2 * motion.switchTravel.railGap) / lensFullHeight;
      if (scaleY > knee && cap > knee) {
        const room = cap - knee;
        const capped = knee + room * Math.tanh((scaleY - knee) / room);
        scaleX += (scaleY - capped) * motion.switchTravel.heightToWidth * (lensFullHeight / fullWidth);
        scaleY = capped;
      }
    }
    if (!gliding.get() && !sliding.get()) {
      scaleY *= 1 + squish.get() * motion.squish.dragHeight;
    }
    scaleY /= Math.max(wobble, 0.5);
    const pressed = poke.get() * pokeSide.get();
    scaleX *= 1 - Math.abs(pressed) * motion.poke.flat;
    scaleY *= 1 + Math.abs(pressed) * motion.poke.bulge;
    const land = landing.get() * tapStay.get() * tapSlide.get();
    scaleX *= 1 + land * motion.tapLanding.wide;
    scaleY *= 1 - land * motion.tapLanding.flat;
    return {
      translateX:
        (left + right) / 2 -
        inlinePad -
        fullWidth / 2 +
        heading.get() * Math.abs(jelly.get()) * (span / 2) * motion.jelly.lean +
        wallSide.get() * squish.get() * (span / 2) -
        pressed * ((span * motion.poke.flat) / 2 + motion.poke.lean),
      translateY: slide * lift.get() * motion.tapSlide.drop + land * (1 - lift.get()) * motion.tapLanding.drop,
      scaleX,
      scaleY,
    };
  });

  const lensRise = useDerivedValue(() => {
    const overhang = (lensGeometry.get().scaleY * lensFullHeight - fullHeight) / 2;
    const out = clamp01(overhang / motion.tapLens.revealOverhang);
    return lerp(out * out * (3 - 2 * out), 1, held.get());
  });
  const lensPeak = useSharedValue(0);
  useAnimatedReaction(
    () =>
      lift.get() < motion.tapLens.fallGrey.from && landing.get() < motion.tapLens.fallGrey.from
        ? 0
        : Math.max(lensPeak.get(), lensRise.get()),
    (peak) => {
      if (peak !== lensPeak.get()) {
        lensPeak.set(peak);
      }
    },
  );
  const lensOut = useDerivedValue(() => {
    const { from, to } = motion.tapLens.fallGrey;
    const fall = clamp01((lift.get() - from) / (to - from));
    const land = landing.get() * tapStay.get() * tapSlide.get();
    return Math.max(lensRise.get(), Math.min(lensPeak.get(), Math.max(fall * fall * (3 - 2 * fall), land)));
  });
  const grey = useDerivedValue(() =>
    Math.max(
      lerp(settleFill.get(), 1 - Math.max(lensOut.get(), tapGlow.get()), tapStay.get()),
      landing.get() * tapStay.get() * tapSlide.get() * motion.tapLanding.tint,
    ),
  );

  const lensStyle = useAnimatedStyle(() => {
    const geometry = lensGeometry.get();
    return {
      opacity: edgesReady.get()
        ? lensPresence.get() * grey.get() * (1 - clamp01(collapsed.get() * motion.labelFadeRate))
        : 0,
      transform: [
        { translateX: geometry.translateX },
        { translateY: geometry.translateY },
        { scaleX: geometry.scaleX },
        { scaleY: geometry.scaleY },
      ],
    };
  });

  const lensGlassOpacity = useDerivedValue(() =>
    edgesReady.get()
      ? Math.max(
          lerp(
            lift.get(),
            clamp01(
              lift.get() *
                (tapStay.get() === 1 && dragRelease.get() === 0 ? motion.tapLens.glassRamp : motion.tapSlide.glassRamp),
            ),
            Math.max(tapSlide.get(), dragRelease.get()),
          ),
          clamp01(landing.get() * tapStay.get() * tapSlide.get() * motion.tapLanding.glassHold),
        )
      : 0,
  );

  const lensGlassStyle = useAnimatedStyle(() => {
    const geometry = lensGeometry.get();
    return {
      opacity: lensGlassOpacity.get() * lerp(1 - settleFill.get(), 1, tapStay.get()),
      transform: [
        { translateX: geometry.translateX },
        { translateY: geometry.translateY },
        { scaleX: geometry.scaleX },
        { scaleY: geometry.scaleY },
      ],
    };
  });

  const iconCover = useDerivedValue(() =>
    clamp01(
      Math.max(
        lensGlassOpacity.get() * motion.tapLens.iconCoverRamp,
        (gliding.get() || dragRelease.get() > 0) && lift.get() > motion.tapLens.coverLift ? 1 : 0,
        landing.get() * tapStay.get() * tapSlide.get() * motion.tapLanding.glassHold * motion.tapLanding.iconHold,
      ) * lerp(clamp01((1 - settleFill.get()) * motion.tapLens.iconCoverRamp), 1, tapStay.get()),
    ),
  );

  const coveredIcons = useDerivedValue(() => {
    const plan = slotPlan.get();
    const scale = scaleX.get();
    const half = itemWidth.get() * motion.tapLens.iconHalf;
    const left = leftEdge.get();
    const right = rightEdge.get();
    const strength = iconCover.get();
    return tabs.map((_, index) => {
      const center = barWidth.get() / 2 + pillShiftX.get() + ((plan.centers[index] ?? 0) - barWidth.get() / 2) * scale;
      const overlap = Math.min(right, center + half) - Math.max(left, center - half);
      return half > 0
        ? strength * clamp01((overlap / (half * 2) - motion.tapLens.coverFrom) / (1 - motion.tapLens.coverFrom))
        : 0;
    });
  });

  const lensIconStyle = useAnimatedStyle(() => {
    const geometry = lensGeometry.get();
    return {
      opacity: iconCover.get(),
      transform: [
        { translateX: geometry.translateX },
        { translateY: geometry.translateY },
        { scaleX: geometry.scaleX },
        { scaleY: geometry.scaleY },
      ],
    };
  });

  const glide = useDerivedValue(() => (gliding.get() ? 1 : 0));

  const switchOptics = useDerivedValue(() => {
    const fade = clamp01((lift.get() - motion.switchTravel.clearFrom) / (1 - motion.switchTravel.clearFrom));
    return gliding.get() ? motion.switchTravel.optics * fade * fade * (3 - 2 * fade) : 1;
  });

  const wallFlat = useDerivedValue(() => {
    const press = clamp01(Math.abs(squish.get()) * motion.squish.flatRate);
    const flat = press * press;
    return {
      side: flat > 0.001 ? -wallSide.get() : 0,
      round: lerp(1, motion.squish.flatRound, flat),
      lead: lerp(1, motion.squish.leadRound, flat),
    };
  });

  const lensOptics = useDerivedValue(() => {
    const geometry = lensGeometry.get();
    const slide = slideShape.get();
    const canal = slide * lift.get();
    const optics = lerp(1, clamp01(lift.get() * motion.tapSlide.glassRamp), slide);
    const travel = switchOptics.get();
    const bendScale = optics * lerp(1, motion.tapSlide.bend, slide) * travel;
    const centerX = inlinePad + lensBase.get() / 2 + geometry.translateX;
    const centerY = fullHeight / 2 + geometry.translateY;
    const reveal = lensOut.get();
    return {
      refraction: glass.lensRefraction * bendScale * reveal,
      magnify: glass.lensMagnify * optics * travel * reveal * (1 - glide.get()),
      rimOut:
        glass.lensRimOut.amount *
        lift.get() *
        reveal *
        lerp(
          glass.lensRimOut.endKeep,
          1,
          clamp01(Math.min(lensPosition.get(), lastIndex - lensPosition.get()) / glass.lensRimOut.endReach),
        ),
      dispersion: glass.lensDispersion * bendScale * reveal * lerp(1, motion.switchTravel.dispersion, glide.get()),
      ellipse: Math.max(
        canal,
        motion.tapLens.ellipse * lift.get() * (1 - held.get()),
        motion.tapLens.heldEllipse * lift.get() * holding.get(),
      ),
      clipLeft: -motion.canal.overflow - centerX,
      clipTop: -motion.canal.overflow - centerY,
      clipRight: barWidth.get() + motion.canal.overflow - centerX,
      clipBottom: fullHeight + motion.canal.overflow - centerY,
      clipScaleX: Math.max(geometry.scaleX, 0.01),
      clipScaleY: Math.max(geometry.scaleY, 0.01),
      clipSoft: motion.canal.soft,
      clipOn: canal,
      wallSide: wallFlat.get().side,
      wallRound: wallFlat.get().round,
      wallLead: wallFlat.get().lead,
    };
  });

  const glideBend = useDerivedValue(() => {
    const span = glideSpan.get();
    if (!gliding.get() || span < 1.5) {
      return 0;
    }
    const progress = clamp01(Math.abs(lensPosition.get() - glideFrom.get()) / span);
    return Math.sin(Math.PI * progress) * clamp01((span - 1) / 2);
  });

  const lensIconProps = useAnimatedProps(() => {
    const optics = lensOptics.get();
    return {
      ...optics,
      refraction: optics.refraction * glass.lensIconBend,
      rimOut: 0,
      topBend: lerp(
        1,
        motion.tapLanding.iconBend,
        Math.max(dripShape.get(), glideBend.get() * motion.switchTravel.topBend),
      ),
      topDepth: lerp(
        1,
        motion.tapLanding.iconDepth,
        Math.max(dripShape.get() * dripShape.get(), glideBend.get() * motion.switchTravel.topBend),
      ),
      rimPrism: glass.lensIconPrism * lensOut.get(),
    };
  });

  const lensSideProps = useAnimatedProps(() => {
    const position = lensPosition.get();
    const geometry = lensGeometry.get();
    const restWidth = lensBase.get();
    const lensCenter = inlinePad + restWidth / 2 + geometry.translateX;
    const gapMiddle = lerp(
      barWidth.get() + layout.tabBarGap / 2,
      barWidth.get() + layout.tabBarGap + motion.meltReach,
      lerp(motion.endMelt, 1, push.get()),
    );
    const sampleMaxX = (gapMiddle - lensCenter) / Math.max(geometry.scaleX, 0.01) + restWidth / 2 + glass.lensPad;
    const pinchScale =
      lerp(1, motion.tapSlide.pinch, slideShape.get()) *
      switchOptics.get() *
      lerp(1, glass.lensGlidePinch[scheme], glide.get());
    const reveal = lensOut.get();
    const optics = lensOptics.get();
    const tint = interpolateColor(
      reveal,
      [0, 1],
      [
        color.lensTintEarly,
        interpolateColor(holding.get() * (1 - tapSlide.get()), [0, 1], [color.lensTint, color.lensHeldTint]),
      ],
    );
    return {
      ...optics,
      dispersion: optics.dispersion * lerp(1, glass.lensHeldDispersion[scheme], holding.get()),
      edgeSharp: lerp(glass.lensEdgeShade[scheme], glass.lensHeldEdge[scheme], holding.get()),
      sampleMaxX: Math.max(sampleMaxX, 1),
      pinch: glass.lensPinch * (1 - deflate.get()) * pinchScale * reveal,
      pinchLeft: glass.lensPinch * clamp01(1 - position / glass.lensPinchEndReach) * pinchScale * reveal,
      pinchRight: glass.lensPinch * clamp01(1 - (lastIndex - position) / glass.lensPinchEndReach) * pinchScale * reveal,
      specular: glass.lensSpecular * reveal,
      rim: interpolateColor(
        reveal,
        [0, 1],
        [color.lensRimEarly, interpolateColor(holding.get(), [0, 1], [color.lensRim, color.lensHeldRim])],
      ),
      rimPrism: glass.lensRimPrism[scheme] * reveal,
      topBend: lerp(1, motion.tapLanding.iconBend, glideBend.get() * motion.switchTravel.topBend),
      topDepth: lerp(1, motion.tapLanding.iconDepth, glideBend.get() * motion.switchTravel.topBend),
      edgeAxis: holding.get(),
      rimWidth: lerp(glass.lensRimWidth[scheme], glass.lensHeldRimWidth[scheme], holding.get()),
      prismAxis: holding.get(),
      prismShift: glass.lensHeldPrismShift[scheme] * holding.get(),
      pinchSpread: lerp(glass.lensPinchSpread, glass.lensHeldPinchSpread[scheme], holding.get()),
      shadow: interpolateColor(reveal, [0, 1], [color.lensTintEarly, color.lensShadow]),
      tint,
    };
  });

  const lensFillStyle = useAnimatedStyle(() => {
    const { side, round, lead } = wallFlat.get();
    const full = lensFullHeight / 2;
    const left = full * (side < 0 ? round : side > 0 ? lead : 1);
    const right = full * (side > 0 ? round : side < 0 ? lead : 1);
    return {
      backgroundColor: interpolateColor(1 - grey.get(), [0, 1], [color.lens, color.lensActive]),
      // Round, the pill's drawn with Apple's continuous ends (lensFillProps); flattened against the bar's end, here.
      opacity: side !== 0 ? 1 : 0,
      borderTopLeftRadius: left,
      borderBottomLeftRadius: left,
      borderTopRightRadius: right,
      borderBottomRightRadius: right,
    };
  });

  // The resting pill's fill, drawn with Apple's continuous ends, as iOS 27's pill is (simulator).
  const lensFillProps = useAnimatedProps(() => ({
    fill: interpolateColor(1 - grey.get(), [0, 1], [color.lens, color.lensActive]),
    opacity: wallFlat.get().side !== 0 ? 0 : 1,
  }));

  return {
    coveredIcons,
    lensFillProps,
    grey,
    iconCover,
    lensFillStyle,
    lensGeometry,
    lensGlassStyle,
    lensIconProps,
    lensIconStyle,
    lensSideProps,
    lensStyle,
  };
};

export type LensStyles = ReturnType<typeof useLensStyles>;
