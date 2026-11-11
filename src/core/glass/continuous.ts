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

// Apple's rounded-rect corner (UIBezierPath's since iOS 7) for a corner at the origin, in units of its radius: three
// cubics from the straight edge, 1.5287 radii along, round to the other. Each entry is two control points and an end.
const corner = [
  [1.08849323, 0, 0.86840689, 0, 0.66993427, 0.065496],
  [0.37282392, 0.16905899, 0.16905883, 0.37282401, 0.07491176, 0.63149399],
  [0, 0.86840701, 0, 1.08849299, 0, 1.52866483],
] as const;
const reach = 1.52866483;

/**
 * A rectangle with Apple's continuous corners of `radius` (UIBezierPath's rounded rect), as an SVG path: unlike
 * `continuousCapsule`, the curve starts about one and a half radii along each edge, as iOS's rounded rects do. A
 * worklet, so an animated outline can be rebuilt on the UI thread.
 */
export const continuousRect = (width: number, height: number, radius: number) => {
  'worklet';
  // Up to half the shorter side, as SwiftUI's continuous rounded rectangle: past a third of it the curves of two corners
  // meet near the middle of the side, where both are all but straight.
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  const f = (n: number) => n.toFixed(3);
  // Each corner: its point, and the directions along the edge it leaves (u) and the one it turns into (v).
  const corners = [
    [width, 0, -1, 0, 0, 1],
    [width, height, 0, -1, -1, 0],
    [0, height, 1, 0, 0, -1],
    [0, 0, 0, 1, 1, 0],
  ] as const;
  let d = `M${f(r * reach)} 0`;
  for (const [cx, cy, ux, uy, vx, vy] of corners) {
    const at = (a: number, b: number) => `${f(cx + (ux * a + vx * b) * r)} ${f(cy + (uy * a + vy * b) * r)}`;
    d += ` L${at(reach, 0)}`;
    for (const [a1, b1, a2, b2, a3, b3] of corner) d += ` C${at(a1, b1)} ${at(a2, b2)} ${at(a3, b3)}`;
  }
  return `${d} Z`;
};
