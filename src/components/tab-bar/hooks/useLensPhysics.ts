import { useFrameCallback, withSpring } from 'react-native-reanimated';

import { space } from '../../../theme/tokens';
import { clamp01, fullHeight, lerp } from '../helpers/bar';
import { layout, motion } from '../tokens';
import type { BarPress } from './useBarPress';
import type { BarState } from './useBarState';

/** Per-frame lens physics: the jelly stretch, the squish against the ends and the edge springs. */
export const useLensPhysics = (bar: BarState & BarPress) => {
  const {
    approachSpeed,
    atEnd,
    barWidth,
    bounceAt,
    collapsed,
    dent,
    dripOnArrival,
    edgesReady,
    glideSpan,
    glideTo,
    gliding,
    heading,
    held,
    itemWidth,
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
    pressedAt,
    pressing,
    previousCollapsed,
    previousLensPosition,
    push,
    restSpan,
    rightEdge,
    rightTarget,
    scaleX,
    settleAt,
    settleOnArrival,
    settledIndex,
    slideFrom,
    slideRight,
    slideShape,
    slideTo,
    sliding,
    smoothSpeed,
    squish,
    squishVelocity,
    startDrip,
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
      lift.set(withSpring(0, motion.springs.release));
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
    smoothSpeed.set(filteredSpeed);
    const acceleration = (filteredSpeed - previousSpeed) / dt;
    const free = 1 - slideShape.get();
    const stretchTarget = Math.min(1, filteredSpeed / motion.lensMoveSpeed) * motion.jelly.stretch * lift.get();
    const omega = (2 * Math.PI) / motion.jelly.period;
    const force =
      omega * omega * (stretchTarget - jelly.get()) -
      2 * motion.jelly.damping * omega * jellyVelocity.get() +
      motion.jelly.kick * acceleration;
    approachSpeed.set(Math.max(approachSpeed.get() * Math.exp(-dt * motion.squish.memory), filteredSpeed));
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
    const nextSquishVelocity = squishVelocity.get() + squishForce * dt;
    squishVelocity.set(nextSquishVelocity);
    squish.set(Math.min(motion.squish.max, Math.max(-motion.squish.max, squish.get() + nextSquishVelocity * dt)));
    const nextVelocity = jellyVelocity.get() + force * dt;
    jellyVelocity.set(nextVelocity);
    jelly.set(Math.min(motion.jelly.max, Math.max(-motion.jelly.max, jelly.get() + nextVelocity * dt)));
    const speedTarget = lift.get() > 0 ? Math.min(1, speed / motion.lensMoveSpeed) : 0;
    if (Math.abs(speedTarget - movingTarget.get()) > 0.05 || (speedTarget === 0 && movingTarget.get() !== 0)) {
      movingTarget.set(speedTarget);
      moving.set(withSpring(speedTarget, motion.springs.stretch));
    }

    const reach =
      middleIndex > 0 ? (lift.get() * held.get() * motion.lensEdgeReach * (position - middleIndex)) / middleIndex : 0;
    const center =
      barWidth.get() / 2 +
      pillShiftX.get() +
      (position - middleIndex) * width +
      reach +
      push.get() * motion.lensPushTravel;
    const restHalf = Math.min(Math.max(layout.bubbleRestWidth, width), width + space[6]) / 2;
    const spread = Math.max(
      lift.get(),
      Math.min(1, landing.get() * tapStay.get() * tapSlide.get() * motion.tapLanding.hold),
    );
    const halfWidth =
      lerp(restHalf, (width / 2) * motion.lensLift.x, spread * free) *
      lerp(1, motion.switchTravel.wide, gliding.get() ? lift.get() : 0);
    const edgeInset = (fullHeight - layout.bubbleRestHeight) / 2;
    const barLeft = pillShiftX.get() + (barWidth.get() * (1 - scaleX.get())) / 2 + edgeInset;
    const barRight = pillShiftX.get() + (barWidth.get() * (1 + scaleX.get())) / 2 - edgeInset;
    const resting = (1 - lift.get()) * (moved.get() ? 0 : 1);
    const hugLeft = Math.min(0, barLeft - (center - halfWidth)) * clamp01(1 - position) * resting;
    const hugRight = Math.max(0, barRight - (center + halfWidth)) * clamp01(position - (lastIndex - 1)) * resting;
    const hugged = center + hugLeft + hugRight;
    const contain = !gliding.get() && resting > 0.5;
    const left = contain ? Math.max(hugged - halfWidth, barLeft) : hugged - halfWidth;
    const right = contain ? Math.min(hugged + halfWidth, barRight) : hugged + halfWidth;
    restSpan.set(halfWidth * 2);

    const collapsing = collapsed.get() !== previousCollapsed.get();
    previousCollapsed.set(collapsed.get());

    if (!edgesReady.get() || (collapsing && lift.get() === 0)) {
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
    if (dripOnArrival.get() && gliding.get() && Math.abs(position - glideTo.get()) < motion.switchTravel.holdArrive) {
      dripOnArrival.set(false);
      gliding.set(false);
      tapStay.set(withSpring(1, motion.springs.snappy));
      startDrip(dent.get());
      lift.set(withSpring(0, motion.springs.landFall));
    }
    if (gliding.get() && lift.get() < 0.001 && Math.abs(position - glideTo.get()) < 0.002) {
      gliding.set(false);
    }
    if (gliding.get() || (tapStay.get() === 1 && !moved.get() && held.get() < 0.5)) {
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
