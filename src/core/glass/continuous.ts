// Apple's continuous corner (UIBezierPath's rounded rect since iOS 7), as the glass shader draws it: each corner's
// outline at its distance from the corner's centre, R(alpha), a polynomial in ((alpha - 45deg) / 72.86deg)^2 fitted to
// Apple's three cubics within 0.001r, over the wedge where it curves; straight between. Keep in step with GlassShader.
const steps = 24;
const mid = Math.PI / 4;
const spread = 1.2717138;
const fit = [1.0017855, -0.0287977, -0.6672829, 3.217769, -5.2756717, 4.1355015, -1.2528373];

const radiusAt = (s: number) => {
  'worklet';
  return fit.reduceRight((sum, c) => sum * s + c, 0);
};

/**
 * The outline of a capsule (radius `radius`, or half its shorter side) with Apple's continuous corners, as an SVG
 * path. A capsule's ends are cut at mid-height and a square with a full radius stays a circle, as iOS 27's are.
 * A worklet, so an animated outline can be rebuilt on the UI thread.
 */
export const continuousCapsule = (width: number, height: number, radius?: number) => {
  'worklet';
  const ex = width / 2;
  const ey = height / 2;
  const r = Math.min(ex, ey, radius ?? Infinity);
  if (Math.abs(ex - ey) < 0.1 * r) {
    return `M0 ${ey} A${ex} ${ey} 0 1 1 ${width} ${ey} A${ex} ${ey} 0 1 1 0 ${ey} Z`;
  }
  const points: string[] = [];
  const quadrants = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ];
  for (const [sx, sy] of quadrants) {
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const u = sx * sy > 0 ? -1 + 2 * t : 1 - 2 * t;
      const alpha = mid + u * spread;
      const radial = r * radiusAt(u * u);
      const x = ex + sx * Math.max(ex - r + radial * Math.cos(alpha), 0);
      const y = ey + sy * Math.max(ey - r + radial * Math.sin(alpha), 0);
      points.push(`${points.length === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`);
    }
  }
  return `${points.join(' ')} Z`;
};
