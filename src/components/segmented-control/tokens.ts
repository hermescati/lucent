export const segmentedMotion = {
  tapForm: 0.8,
  dim: { at: 0.9, depth: 0.3, spring: { duration: 450, dampingRatio: 1 } },
  lens: {
    glide: true,
    holdAfterRelease: 0,
    settleWithin: 60,
    solidAt: 0.45,
    solidSpring: { duration: 110, dampingRatio: 1 },
    edges: { lead: 26, trail: 18.3 },
    slideFrom: 0,
    liftSpring: { duration: 100, dampingRatio: 1 },
    arriveWithin: 18,
    spreadScale: 0.2,
    landTrail: { omega: 7.5, damping: 0.7 },
    brake: 0.014,
    squash: 1.1,
    wobble: { period: 1, damping: 0.7 },
  },
} as const;

export const segmentedMetrics = {
  height: 32,
  inset: 2,
  insetX: 0,
  grow: { x: 23, y: 16 },
  thumbInset: 2.45,
  label: { fontSize: 14, lineHeight: 18 },
  weight: { normal: '400', selected: '600' },
  dragFrom: 3,
  tapSlop: 10,
  hitSlop: 8,
  disabledOpacity: 0.5,
} as const;
