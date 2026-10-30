import { useFrameCallback, useSharedValue, withDelay, withSpring, type SharedValue } from 'react-native-reanimated';

import { lensMotion } from '../theme/tokens';

export interface LensBounds {
  min: number;
  max: number;
}

export interface LensOptions {
  solidAt?: number;
  settleWithin?: number;
  holdAfterRelease?: number;
  shrink?: { duration: number; dampingRatio: number };
  haze?: { duration: number; dampingRatio: number };
  whiten?: { duration: number; dampingRatio: number };
  stretchMax?: number;
  carry?: number;
  squash?: number;
  wobble?: { period: number; damping: number };
  landKick?: number;
  landSpring?: { period: number; damping: number };
  solidSpring?: { duration: number; dampingRatio: number };
  glide?: boolean;
  edges?: { lead: number; trail: number };
  slideFrom?: number;
  liftSpring?: { duration: number; dampingRatio: number };
  arriveWithin?: number;
  spreadScale?: number;
  landTrail?: { omega: number; damping: number };
  brake?: number;
  pressDelay?: number;
  pressSpring?: { duration: number; dampingRatio: number };
  liftFrostUntil?: number;
  landBump?: number;
  whitenDelay?: number;
  landSquash?: number;
  hazeDelay?: number;
  frostOnArrive?: boolean;
  melt?: { duration: number; dampingRatio: number };
  slideAt?: number;
  landBumpAt?: number;
  liftHaze?: { duration: number; dampingRatio: number };
}

export interface LensState {
  x: SharedValue<number>;
  haze: SharedValue<number>;
  white: SharedValue<number>;
  form: SharedValue<number>;
  solid: SharedValue<number>;
  stretch: SharedValue<number>;
  spread: SharedValue<number>;
  land: SharedValue<number>;
  squash: number;
  landSquash: number;
  frostUntil: SharedValue<number>;
  anchor: SharedValue<number>;
  press: (finger: number) => void;
  move: (finger: number) => void;
  release: (target: number) => void;
  slide: (target: number, formTo?: number) => void;
  kick: (amount: number) => void;
}

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

const step = (value: SharedValue<number>, velocity: SharedValue<number>, to: number, omega: number, dt: number, damping = 1) => {
  'worklet';
  const steps = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    velocity.set(velocity.get() + (omega * omega * (to - value.get()) - 2 * damping * omega * velocity.get()) * h);
    value.set(value.get() + velocity.get() * h);
  }
};

export const useLens = (
  initial: number,
  bounds: SharedValue<LensBounds>,
  {
    solidAt = lensMotion.solidAt,
    settleWithin = lensMotion.trailArrive,
    holdAfterRelease = lensMotion.holdAfterRelease,
    shrink = lensMotion.springs.shrink,
    haze: hazeSpring = lensMotion.springs.haze,
    whiten,
    stretchMax = lensMotion.stretch.max,
    carry = 1,
    squash = lensMotion.stretch.squash,
    wobble = lensMotion.stretch,
    landKick,
    landSpring = lensMotion.land,
    solidSpring = lensMotion.springs.solid,
    glide = false,
    edges = lensMotion.edges,
    slideFrom = lensMotion.slideFrom,
    liftSpring,
    arriveWithin = lensMotion.arrive,
    spreadScale = 1,
    landTrail,
    brake = 0,
    pressDelay = lensMotion.pressDelay,
    pressSpring = lensMotion.springs.form,
    liftFrostUntil = lensMotion.frostUntil,
    landBump,
    whitenDelay = 0,
    landSquash = lensMotion.land.squash,
    hazeDelay = 0,
    frostOnArrive = false,
    melt = lensMotion.springs.melt,
    slideAt = lensMotion.formedAt,
    landBumpAt,
    liftHaze,
  }: LensOptions = {},
): LensState => {
  const x = useSharedValue(initial);
  const haze = useSharedValue(0);
  const white = useSharedValue(0);
  const form = useSharedValue(0);
  const solid = useSharedValue(1);
  const stretch = useSharedValue(0);
  const stretchVelocity = useSharedValue(0);
  const spread = useSharedValue(0);
  const land = useSharedValue(0);
  const landVelocity = useSharedValue(0);
  const speed = useSharedValue(0);
  const releaseSpeed = useSharedValue(0);
  const velocity = useSharedValue(0);
  const previous = useSharedValue(initial);
  const grab = useSharedValue(0);
  const start = useSharedValue(0);
  const held = useSharedValue(false);
  const lead = useSharedValue(initial);
  const leadVelocity = useSharedValue(0);
  const trail = useSharedValue(initial);
  const trailVelocity = useSharedValue(0);
  const sliding = useSharedValue(false);
  const shrinking = useSharedValue(false);
  const landed = useSharedValue(false);
  const heading = useSharedValue(1);
  const peak = useSharedValue(0);
  const anchor = useSharedValue(0);
  const travel = useSharedValue(0);
  const target = useSharedValue<number | null>(null);
  const pending = useSharedValue<number | null>(null);
  const pendingAt = useSharedValue<number>(lensMotion.formedAt);
  const releasedFor = useSharedValue(-1);
  const frostUntil = useSharedValue<number>(lensMotion.frostUntil);
  const bumpPending = useSharedValue(0);

  const beginSlide = (to: number) => {
    'worklet';
    const now = x.get();
    heading.set(to >= now ? 1 : -1);
    x.set(now);
    lead.set(now);
    trail.set(now);
    releaseSpeed.set(speed.get());
    leadVelocity.set(velocity.get() * carry);
    trailVelocity.set(velocity.get() * carry);
    target.set(to);
    shrinking.set(false);
    landed.set(false);
    sliding.set(true);
    if (!frostOnArrive) {
      haze.set(withDelay(hazeDelay, withSpring(1, hazeSpring)));
      if (whiten) {
        white.set(withDelay(whitenDelay, withSpring(1, whiten)));
      }
    }
  };

  const press = (finger: number) => {
    'worklet';
    held.set(true);
    bumpPending.set(0);
    releasedFor.set(-1);
    sliding.set(false);
    shrinking.set(false);
    landed.set(false);
    target.set(null);
    pending.set(null);
    spread.set(0);
    haze.set(0);
    if (liftHaze) {
      haze.set(1);
      haze.set(withSpring(0, liftHaze));
    }
    white.set(0);
    frostUntil.set(liftFrostUntil);
    grab.set(x.get() - finger);
    start.set(finger);
    solid.set(withDelay(pressDelay, withSpring(0, melt)));
    form.set(withDelay(pressDelay, withSpring(1, pressSpring)));
  };

  const move = (finger: number) => {
    'worklet';
    if (!held.get()) {
      return;
    }
    const { min, max } = bounds.get();
    const offset = grab.get() * Math.exp(-Math.abs(finger - start.get()) / lensMotion.grabFade);
    x.set(withSpring(clamp(finger + offset, min, max), lensMotion.springs.follow));
  };

  const release = (to: number) => {
    'worklet';
    held.set(false);
    releasedFor.set(0);
    if (form.get() < slideAt) {
      pendingAt.set(slideAt);
      pending.set(to);
      return;
    }
    beginSlide(to);
  };

  const slide = (to: number, formTo = 1) => {
    'worklet';
    held.set(false);
    releasedFor.set(0);
    sliding.set(false);
    shrinking.set(false);
    target.set(null);
    spread.set(0);
    solid.set(withSpring(0, liftSpring ?? lensMotion.springs.solid));
    form.set(withSpring(formTo, liftSpring ?? lensMotion.springs.form));
    pendingAt.set(formTo * slideFrom);
    pending.set(to);
  };

  useFrameCallback((frame) => {
    const resting =
      !sliding.get() &&
      pending.get() === null &&
      !held.get() &&
      form.get() === 0 &&
      stretch.get() === 0 &&
      stretchVelocity.get() === 0 &&
      land.get() === 0 &&
      landVelocity.get() === 0;
    if (resting) {
      if (previous.get() !== x.get()) {
        previous.set(x.get());
      }
      return;
    }
    const elapsed = Math.max(frame.timeSincePreviousFrame ?? 16, 1);
    const dt = Math.min(elapsed, 34) / 1000;

    if (releasedFor.get() >= 0) {
      releasedFor.set(releasedFor.get() + dt);
    }

    const queued = pending.get();
    if (queued !== null && form.get() >= pendingAt.get()) {
      pending.set(null);
      beginSlide(queued);
    }

    const to = target.get();
    if (sliding.get() && to !== null) {
      step(lead, leadVelocity, to, edges.lead, dt);
      if (landed.get() && landTrail !== undefined) {
        step(trail, trailVelocity, to, landTrail.omega, dt, landTrail.damping);
      } else {
        step(trail, trailVelocity, to, edges.trail, dt);
      }
      x.set((lead.get() + trail.get()) / 2);
      const gap = landTrail === undefined ? Math.abs(lead.get() - trail.get()) : (lead.get() - trail.get()) * heading.get();
      spread.set(gap * (1 + (spreadScale - 1) * Math.min(1, form.get() / lensMotion.formedAt)));
      if (!shrinking.get() && Math.abs(lead.get() - to) < arriveWithin && releasedFor.get() >= holdAfterRelease) {
        shrinking.set(true);
        frostUntil.set(lensMotion.frostUntil);
        form.set(withSpring(0, shrink));
        if (frostOnArrive) {
          haze.set(withDelay(hazeDelay, withSpring(1, hazeSpring)));
          if (whiten) {
            white.set(withDelay(whitenDelay, withSpring(1, whiten)));
          }
        }
      }
      if (shrinking.get() && !landed.get() && Math.abs(trail.get() - to) < settleWithin && form.get() < solidAt) {
        landed.set(true);
        solid.set(withSpring(1, solidSpring));
        if (!frostOnArrive) {
          haze.set(0);
        }
        const impact = landBump ?? (landKick === undefined ? Math.min(speed.get() * lensMotion.land.kick, lensMotion.land.max) : releaseSpeed.get() * landKick);
        if (landBumpAt === undefined) {
          landVelocity.set(landVelocity.get() - impact);
        } else {
          bumpPending.set(impact);
        }
      }
      if (landed.get() && (!glide || (Math.abs(lead.get() - to) < lensMotion.rest && Math.abs(trail.get() - to) < lensMotion.rest && (landTrail === undefined || Math.abs(trailVelocity.get()) < 1)))) {
        sliding.set(false);
        shrinking.set(false);
        landed.set(false);
        target.set(null);
        x.set(to);
        spread.set(0);
        if (!frostOnArrive) {
          white.set(0);
        }
      }
    }

    if (landBumpAt !== undefined && bumpPending.get() !== 0 && form.get() < landBumpAt) {
      landVelocity.set(landVelocity.get() - bumpPending.get());
      bumpPending.set(0);
    }

    const position = x.get();
    const delta = position - previous.get();
    previous.set(position);
    velocity.set((delta * 1000) / elapsed);
    const raw = Math.abs(velocity.get());
    const before = speed.get();
    speed.set(speed.get() + (raw - speed.get()) * (1 - Math.exp(-dt * lensMotion.stretch.smoothing)));
    if (brake > 0 && held.get() && !sliding.get()) {
      peak.set(Math.max(peak.get() * Math.exp(-dt / lensMotion.peakFade), speed.get()));
      if (speed.get() >= lensMotion.stopBelow) {
        travel.set(Math.sign(velocity.get()));
      }
      if (before >= lensMotion.stopBelow && speed.get() < lensMotion.stopBelow) {
        anchor.set(travel.get());
        stretchVelocity.set(stretchVelocity.get() - brake * peak.get() * form.get());
        peak.set(0);
      }
    }

    const s = lensMotion.stretch;
    const want = sliding.get() ? 0 : clamp((speed.get() - s.from) / s.span, 0, 1) * stretchMax * form.get();
    const omega = (2 * Math.PI) / wobble.period;
    stretchVelocity.set(
      stretchVelocity.get() + (omega * omega * (want - stretch.get()) - 2 * wobble.damping * omega * stretchVelocity.get()) * dt,
    );
    const nextStretch = stretch.get() + stretchVelocity.get() * dt;
    const stretchStill = Math.abs(nextStretch) < 1e-4 && Math.abs(stretchVelocity.get()) < 1e-3 && want === 0;
    stretch.set(stretchStill ? 0 : nextStretch);
    if (stretchStill) {
      stretchVelocity.set(0);
    }

    const landOmega = (2 * Math.PI) / landSpring.period;
    landVelocity.set(landVelocity.get() + (-landOmega * landOmega * land.get() - 2 * landSpring.damping * landOmega * landVelocity.get()) * dt);
    const nextLand = land.get() + landVelocity.get() * dt;
    const landStill = Math.abs(nextLand) < 1e-4 && Math.abs(landVelocity.get()) < 1e-3;
    land.set(landStill ? 0 : nextLand);
    if (landStill) {
      landVelocity.set(0);
    }
  });

  const kick = (amount: number) => {
    'worklet';
    stretchVelocity.set(stretchVelocity.get() + amount);
  };

  return { x, haze, white, form, solid, stretch, spread, land, squash, landSquash, frostUntil, anchor, press, move, release, slide, kick };
};
