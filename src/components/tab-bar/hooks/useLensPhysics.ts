import { useFrameCallback, withDelay, withSpring } from 'react-native-reanimated';

import { clamp01, fullHeight, lerp } from '../helpers/bar';
import { pillWidthAt, slotCenterAt } from '../helpers/slots';
import { layout, motion } from '../tokens';
import type { BarPress } from './useBarPress';
import type { BarState } from './useBarState';

// Below this, a hand-integrated value (the jelly, the squish, the smoothed speeds) is at rest.
const restBelow = 1e-4;

/** Per-frame lens physics: the jelly stretch, the squish against the ends and the edge springs. */
export const useLensPhysics = (bar: BarState & BarPress) => {
  const {
    approachSpeed,
    atEnd,
    barGrowth,
    barPress,
    barWidth,
    bounceAt,
    collapsed,
    edgesReady,
    glideSpan,
    glideTo,
    gliding,
    heading,
    held,
    itemWidth,
    slotPlan,
    jelly,
    jellyVelocity,
    landing,
    lastIndex,
    leftEdge,
    leftTarget,
    lensPosition,
    lift,
    middleIndex,
    moved,
    moving,
    movingTarget,
    pillShiftX,
    planMix,
    pressedAt,
    pressing,
    previousCollapsed,
    previousLensPosition,
    push,
    restSpan,
    placeSpan,
    rightEdge,
    rightTarget,
    scaleX,
    settleAt,
    settleOnArrival,
    settledIndex,
    settleFill,
    slideFrom,
    slideRight,
    slideShape,
    slideTo,
    sliding,
    smoothSpeed,
    squish,
    squishVelocity,
    tapSlide,
    tapStay,
    wallSide,
  } = bar;

  useFrameCallback((frame) => {
    const width = itemWidth.get();
    if (width <= 0) {
      return;
    }
    const position = lensPosition.get();
    const delta = position - previousLensPosition.get();
    if (bounceAt.get() >= 0 && Date.now() >= bounceAt.get()) {
      bounceAt.set(-1);
      lensPosition.set(withSpring(settledIndex.get(), motion.springs.lens));
    }
    if (settleAt.get() >= 0 && Math.abs(position - settleAt.get()) < motion.dragSettle.near) {
      settleAt.set(-1);
      lift.set(withDelay(motion.dragSettle.after, withSpring(0, motion.dragSettle.lower)));
      settleFill.set(withDelay(motion.dragSettle.after, withSpring(1, motion.dragSettle.fill)));
      barPress.set(withDelay(motion.dragSettle.after, withSpring(0, motion.dragSettle.relax)));
      barGrowth.set(withDelay(motion.dragSettle.after, withSpring(0, motion.dragSettle.relax)));
    }
    const direction = Math.sign(delta);
    previousLensPosition.set(position);
    const elapsed = Math.max(frame.timeSincePreviousFrame ?? 16, 1);
    const speed = (Math.abs(delta) * 1000) / elapsed;
    const dt = Math.min(elapsed, 34) / 1000;
    if (Math.abs(delta) > 0.002) {
      heading.set(Math.sign(delta));
    }
    const previousSpeed = smoothSpeed.get();
    const filteredSpeed = lerp(previousSpeed, speed, 1 - Math.exp(-dt * motion.jelly.smoothing));
    smoothSpeed.set(filteredSpeed < restBelow ? 0 : filteredSpeed);
    const acceleration = (filteredSpeed - previousSpeed) / dt;
    const free = 1 - slideShape.get();
    // Moving, the lens stretches with its speed and springs back as it stops: about 10% at a quick swipe, and about 7%
    // gliding to a tapped tab (iPhone 18 Pro Max: 131pt at rest lifted, 140 at speed).
    const stretchTarget =
      Math.min(1, filteredSpeed / motion.lensMoveSpeed) *
      motion.jelly.stretch *
      lift.get() *
      (gliding.get() ? motion.switchTravel.stretch : 1);
    const omega = (2 * Math.PI) / motion.jelly.period;
    const force =
      omega * omega * (stretchTarget - jelly.get()) -
      2 * motion.jelly.damping * omega * jellyVelocity.get() +
      motion.jelly.kick * acceleration;
    const approach = Math.max(approachSpeed.get() * Math.exp(-dt * motion.squish.memory), filteredSpeed);
    approachSpeed.set(approach < restBelow ? 0 : approach);
    const endZone = gliding.get() ? motion.switchTravel.contactZone : motion.jelly.endZone;
    const nearLeft = position <= endZone && Math.abs(leftEdge.get() - leftTarget.get()) < motion.squish.contact;
    const nearRight =
      position >= lastIndex - endZone && Math.abs(rightEdge.get() - rightTarget.get()) < motion.squish.contact;
    const endReached = nearLeft || nearRight;
    if (endReached && !atEnd.get() && (lift.get() > 0.5 || sliding.get() || gliding.get())) {
      wallSide.set(nearLeft ? -1 : 1);
      squishVelocity.set(
        squishVelocity.get() +
          (gliding.get()
            ? motion.switchTravel.squishKick * glideSpan.get()
            : Math.min(approachSpeed.get(), motion.squish.speedCap) *
              motion.squish.impact *
              (sliding.get() ? lerp(1, motion.tapSlide.impact, tapSlide.get()) : motion.squish.dragImpact)),
      );
    }
    atEnd.set(endReached);
    const squishOmega =
      (2 * Math.PI) /
      (gliding.get()
        ? motion.switchTravel.squishPeriod
        : sliding.get()
          ? motion.squish.period
          : motion.squish.dragPeriod);
    const squishForce =
      -squishOmega * squishOmega * squish.get() -
      2 *
        (gliding.get()
          ? motion.switchTravel.squishDamping
          : sliding.get()
            ? motion.squish.damping
            : motion.squish.dragDamping) *
        squishOmega *
        squishVelocity.get();
    // Each comes to rest at exactly 0 once it's too small to see: decaying forever, it changed the lens's transforms by
    // float noise every frame and kept the window drawing with nothing moving.
    const nextSquishVelocity = squishVelocity.get() + squishForce * dt;
    const nextSquish = Math.min(
      motion.squish.max,
      Math.max(-motion.squish.max, squish.get() + nextSquishVelocity * dt),
    );
    const squishRests = Math.abs(nextSquish) < restBelow && Math.abs(nextSquishVelocity) < restBelow;
    squishVelocity.set(squishRests ? 0 : nextSquishVelocity);
    squish.set(squishRests ? 0 : nextSquish);
    const nextVelocity = jellyVelocity.get() + force * dt;
    const nextJelly = Math.min(motion.jelly.max, Math.max(-motion.jelly.max, jelly.get() + nextVelocity * dt));
    const jellyRests = Math.abs(nextJelly - stretchTarget) < restBelow && Math.abs(nextVelocity) < restBelow;
    jellyVelocity.set(jellyRests ? 0 : nextVelocity);
    jelly.set(jellyRests ? stretchTarget : nextJelly);
    const speedTarget = lift.get() > 0 ? Math.min(1, speed / motion.lensMoveSpeed) : 0;
    if (Math.abs(speedTarget - movingTarget.get()) > 0.05 || (speedTarget === 0 && movingTarget.get() !== 0)) {
      movingTarget.set(speedTarget);
      moving.set(withSpring(speedTarget, motion.springs.stretch));
    }

    const reach =
      middleIndex > 0 ? (lift.get() * held.get() * motion.lensEdgeReach * (position - middleIndex)) / middleIndex : 0;
    // Each tab at its own place and width (helpers/slots), scaled with the bar as it minimizes.
    const plan = slotPlan.get();
    const scale = scaleX.get();
    const center =
      barWidth.get() / 2 +
      pillShiftX.get() +
      (slotCenterAt(plan, position) - barWidth.get() / 2) * scale +
      reach +
      push.get() * motion.lensPushTravel;
    // iOS 27 fits the resting pill to its tab: its slot and the space beside it, and a margin.
    const restHalf = (pillWidthAt(plan, position, layout.tabSpacing.outset) * scale) / 2;
    const spread = Math.max(
      lift.get(),
      Math.min(1, landing.get() * tapStay.get() * tapSlide.get() * motion.tapLanding.hold),
    );
    // Lifted, it grows past its pill by a fixed margin at each side (iOS 27: 82 to 102pt, 105 to 125).
    const liftHalf = restHalf + motion.lensLift.grow * scale;
    const halfWidth =
      lerp(restHalf, liftHalf, spread * free) * lerp(1, motion.switchTravel.wide, gliding.get() ? lift.get() : 0);
    const edgeInset = (fullHeight - layout.bubbleRestHeight) / 2;
    const barLeft = pillShiftX.get() + (barWidth.get() * (1 - scaleX.get())) / 2 + edgeInset;
    const barRight = pillShiftX.get() + (barWidth.get() * (1 + scaleX.get())) / 2 - edgeInset;
    const resting = (1 - lift.get()) * (moved.get() ? 0 : 1);
    const hugLeft = Math.min(0, barLeft - (center - halfWidth)) * clamp01(1 - position) * resting;
    // A lone tab is the first and the last: it hugs the left end only, or a bar still shrinking to it would drag it right.
    const hugRight =
      lastIndex > 0 ? Math.max(0, barRight - (center + halfWidth)) * clamp01(position - (lastIndex - 1)) * resting : 0;
    const hugged = center + hugLeft + hugRight;
    const contain = !gliding.get() && resting > 0.5;
    const left = contain ? Math.max(hugged - halfWidth, barLeft) : hugged - halfWidth;
    const right = contain ? Math.min(hugged + halfWidth, barRight) : hugged + halfWidth;
    restSpan.set(halfWidth * 2);
    // Only when it changes: a new object every frame counts as a change, and kept everything that reads it, and the
    // window, drawing at rest.
    const span = placeSpan.get();
    const grow = (liftHalf - restHalf) * 2 * free;
    if (span.rest !== restHalf * 2 || span.grow !== grow) placeSpan.set({ rest: restHalf * 2, grow });

    const collapsing = collapsed.get() !== previousCollapsed.get();
    previousCollapsed.set(collapsed.get());

    // While the tabs move to a new layout (one added or removed, search splitting off or melting in), the resting pill
    // rides with its tab rather than chasing it on its springs.
    const relayout = planMix.get() < 0.999 && lift.get() === 0 && !sliding.get() && !gliding.get();
    if (!edgesReady.get() || (collapsing && lift.get() === 0) || relayout) {
      edgesReady.set(true);
      leftEdge.set(left);
      rightEdge.set(right);
      leftTarget.set(left);
      rightTarget.set(right);
      return;
    }

    if (sliding.get()) {
      const travel = slideTo.get() - slideFrom.get();
      const lead = slideRight.get() ? rightEdge.get() : leftEdge.get();
      const arrived = Math.abs(travel) > 0.5 ? (lead - slideFrom.get()) / travel : 1;
      if (settleOnArrival.get() && arrived >= motion.tapSlide.arrival) {
        settleOnArrival.set(false);
        lift.set(withSpring(0, motion.springs.tapSettle));
      }
      const resting =
        lift.get() < 0.001 &&
        Math.abs(leftEdge.get() - leftTarget.get()) < motion.edgeEpsilon &&
        Math.abs(rightEdge.get() - rightTarget.get()) < motion.edgeEpsilon &&
        Math.abs(position - Math.round(position)) < 0.002;
      if (tapSlide.get() > 0.5 && !resting) {
        return;
      }
      sliding.set(false);
    }

    if (
      pressing.get() &&
      gliding.get() &&
      !moved.get() &&
      Date.now() - pressedAt.get() >= motion.tapSlide.holdDelay &&
      Math.abs(position - glideTo.get()) < motion.switchTravel.holdArrive
    ) {
      gliding.set(false);
      tapStay.set(withSpring(1, motion.springs.lift));
      landing.set(withSpring(1, motion.springs.landIn));
    }
    if (gliding.get() && lift.get() < 0.001 && Math.abs(position - glideTo.get()) < 0.002) {
      gliding.set(false);
    }
    // Pressed in place, it swells and settles as one: its edges keep to its lift rather than chasing it on their springs.
    if (gliding.get() || (tapStay.get() === 1 && !moved.get())) {
      leftTarget.set(left);
      rightTarget.set(right);
      leftEdge.set(left);
      rightEdge.set(right);
      return;
    }

    const settling = direction === 0;
    if (Math.abs(left - leftTarget.get()) > motion.edgeEpsilon) {
      leftTarget.set(left);
      const config = settling
        ? motion.springs.jellySettle
        : direction < 0
          ? motion.springs.jellyLead
          : motion.springs.jellyTrail;
      leftEdge.set(withSpring(left, config));
    }
    if (Math.abs(right - rightTarget.get()) > motion.edgeEpsilon) {
      rightTarget.set(right);
      const config = settling
        ? motion.springs.jellySettle
        : direction > 0
          ? motion.springs.jellyLead
          : motion.springs.jellyTrail;
      rightEdge.set(withSpring(right, config));
    }
  });
};
