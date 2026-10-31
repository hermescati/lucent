const steps = 96;

export const continuousCapsule = (width: number, height: number) => {
  const wide = width >= height;
  const long = Math.max(width, height) / 2;
  const short = Math.min(width, height) / 2;
  const reach = Math.min(short * 1.528, long);
  const t = Math.min(1, Math.max(0, (reach / short - 1) / 0.51));
  const eLong = 2 + 1.35 * t;
  const points: string[] = [];
  for (let step = 0; step < steps; step++) {
    const angle = (step * 2 * Math.PI) / steps;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const l = Math.sign(c || 1) * (long - reach + reach * Math.pow(Math.abs(c), 2 / eLong));
    const h = Math.sign(s || 1) * short * Math.abs(s);
    const x = width / 2 + (wide ? l : h);
    const y = height / 2 + (wide ? h : l);
    points.push(`${step === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  return `${points.join(' ')} Z`;
};
