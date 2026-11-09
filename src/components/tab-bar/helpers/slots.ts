/**
 * Where iOS 27 puts a tab bar's tabs, built as Apple's iOS 27 Figma kit builds the bar and sized as the simulator
 * (iPhone 18 Pro) lays it out. Each tab is an item that keeps `contentPad` around its content (label, or icon) and
 * otherwise wants `ideal` wide; neighbours overlap by `overlap`, and the bar wraps them with `edge` at each end. With
 * too little room, the tabs overlap more, up to `crowdedOverlap`; past that, iOS lays the tabs out at their floors (`min`,
 * or their content) and scales the whole row, overlaps too, to the room. The selected tab's bubble is the tab itself,
 * `outset` wider at each side.
 * Asked to `fill`, the tabs widen evenly until the bar fills the room: iOS 27 does this for three tabs or more beside
 * an action's circle, keeping the circle 8pt away (iPhone 18 Pro Max: 328pt for three tabs where they want 300; one
 * tab stays 111 and two 205, far from the circle).
 * Measured: two tabs beside search's circle 205pt; three centred 297; four entries 99 each, bubbles 103; five, Components
 * 101 (bubble 105) and the rest 78 (bubbles 82). On the iPhone 18 Pro Max, five entries (or four beside the circle) are
 * the same row scaled up: Components 114, the rest 87, overlapping 19.
 */
export interface TabSpacing {
  edge: number;
  overlap: number;
  crowdedOverlap: number;
  ideal: number;
  min: number;
  contentPad: number;
  outset: number;
}

export interface SlotPlan {
  // The bar's width around its tabs.
  width: number;
  // Each tab's left edge, width and centre, from the bar's left edge.
  lefts: number[];
  widths: number[];
  centers: number[];
  // How far neighbouring tabs overlap.
  overlap: number;
}

export const planSlots = (room: number, contents: number[], spacing: TabSpacing, fill = false): SlotPlan => {
  'worklet';
  const count = contents.length;
  const { edge, contentPad, ideal, min } = spacing;
  if (count === 0) {
    return { width: edge * 2, lefts: [], widths: [], centers: [], overlap: spacing.overlap };
  }
  const joins = count - 1;
  const fits = contents.map((content) => content + contentPad * 2);
  const wants = fits.map((fit) => Math.max(ideal, fit));
  const floors = fits.map((fit) => Math.max(min, fit));
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const span = (widths: number[], overlap: number) => edge * 2 + sum(widths) - overlap * joins;
  let overlap = spacing.overlap;
  let widths = wants;
  if (span(wants, overlap) > room) {
    overlap = joins > 0 ? Math.min((edge * 2 + sum(wants) - room) / joins, spacing.crowdedOverlap) : 0;
    const target = room - edge * 2 + overlap * joins;
    if (sum(wants) > target) {
      const scale = (room - edge * 2) / Math.max(sum(floors) - overlap * joins, 1);
      widths = floors.map((floor) => floor * scale);
      overlap *= scale;
    }
  } else if (fill) {
    const spare = (room - span(wants, overlap)) / count;
    widths = wants.map((want) => want + spare);
  }
  const lefts: number[] = [];
  let x = edge;
  for (let index = 0; index < count; index++) {
    lefts.push(x);
    x += widths[index] - overlap;
  }
  return {
    width: Math.min(span(widths, overlap), Math.max(room, edge * 2)),
    lefts,
    widths,
    centers: lefts.map((left, index) => left + widths[index] / 2),
    overlap,
  };
};

// A value along the tabs at a fractional index, between neighbours' and on past the ends at the last step.
const along = (values: number[], position: number) => {
  'worklet';
  const count = values.length;
  if (count === 0) {
    return 0;
  }
  if (count === 1) {
    return values[0];
  }
  const index = Math.min(Math.max(Math.floor(position), 0), count - 2);
  return values[index] + (values[index + 1] - values[index]) * (position - index);
};

/** The centre of the tab at a fractional index, from the bar's left edge. */
export const slotCenterAt = (plan: SlotPlan, position: number) => {
  'worklet';
  return along(plan.centers, position);
};

/** The width of the tab at a fractional index, eased between neighbours. */
export const slotWidthAt = (plan: SlotPlan, position: number) => {
  'worklet';
  const count = plan.widths.length;
  return count === 0 ? 0 : along(plan.widths, Math.min(Math.max(position, 0), count - 1));
};

/** The resting bubble's width on the tab at a fractional index: the tab, `outset` wider at each side. */
export const pillWidthAt = (plan: SlotPlan, position: number, outset: number) => {
  'worklet';
  return slotWidthAt(plan, position) + outset * 2;
};

/** The fractional index at `x` from the bar's left edge: the inverse of `slotCenterAt`. */
export const slotIndexAt = (plan: SlotPlan, x: number) => {
  'worklet';
  const { centers } = plan;
  const count = centers.length;
  if (count < 2) {
    return 0;
  }
  let index = 0;
  while (index < count - 2 && x > centers[index + 1]) {
    index++;
  }
  const span = centers[index + 1] - centers[index];
  return index + (span > 0 ? (x - centers[index]) / span : 0);
};

/** Between two plans, `mix` of the way: tab by tab, a tab new in `to` at its place there. */
export const mixSlots = (from: SlotPlan, to: SlotPlan, mix: number): SlotPlan => {
  'worklet';
  const lerpAll = (a: number[], b: number[]) =>
    b.map((value, index) => (index < a.length ? a[index] + (value - a[index]) * mix : value));
  return {
    lefts: lerpAll(from.lefts, to.lefts),
    widths: lerpAll(from.widths, to.widths),
    centers: lerpAll(from.centers, to.centers),
    width: from.width + (to.width - from.width) * mix,
    overlap: from.overlap + (to.overlap - from.overlap) * mix,
  };
};
