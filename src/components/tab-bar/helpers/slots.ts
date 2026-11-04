/**
 * Where iOS 27 puts a tab bar's tabs (simulator, iPhone 18 Pro): every tab gets an equal share of the bar after 24pt at
 * each end and 28pt between them, unless its content (label, or icon) is wider, when it keeps its content's width and
 * the space at the ends and between shrinks evenly to fit. Three tabs come out 62pt each, Components' label exactly;
 * five, Components 62 and the rest 40 with 25pt around each.
 */
export interface SlotPlan {
  // Each tab's left edge, width and centre, from the bar's left edge.
  lefts: number[];
  widths: number[];
  centers: number[];
}

export const planSlots = (width: number, contents: number[], end: number, gap: number): SlotPlan => {
  'worklet';
  const count = contents.length;
  if (count === 0) {
    return { lefts: [], widths: [], centers: [] };
  }
  const share = Math.max((width - end * 2 - gap * (count - 1)) / count, 0);
  const widths = contents.map((content) => Math.max(content, share));
  const total = widths.reduce((sum, item) => sum + item, 0);
  const fits = total <= share * count + 0.01;
  const space = fits ? 0 : Math.max((width - total) / (count + 1), 0);
  const lefts: number[] = [];
  let x = fits ? end : space;
  for (let index = 0; index < count; index++) {
    lefts.push(x);
    x += widths[index] + (fits ? gap : space);
  }
  return { lefts, widths, centers: lefts.map((left, index) => left + widths[index] / 2) };
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
  };
};
