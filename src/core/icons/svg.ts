export interface VectorLayer {
  commands: number[];
  fill: number | null;
  stroke: number | null;
  strokeWidth: number;
  cap: 'butt' | 'round' | 'square';
  join: 'miter' | 'round' | 'bevel';
  evenOdd: boolean;
}

export interface VectorIcon {
  viewBox: [number, number, number, number];
  layers: VectorLayer[];
}

export const MOVE = 0;
export const LINE = 1;
export const CURVE = 2;
export const CLOSE = 3;

type Attributes = Record<string, string>;

interface Style {
  fill: string;
  stroke: string;
  strokeWidth: number;
  cap: VectorLayer['cap'];
  join: VectorLayer['join'];
  evenOdd: boolean;
}

const BLACK = 0xff000000;
const KAPPA = 0.5522847498;

const namedColors: Record<string, number> = { black: 0x000000, white: 0xffffff };

const parseColor = (value: string): number | null => {
  const text = value.trim().toLowerCase();
  if (text === 'none' || text === 'transparent') {
    return null;
  }
  if (text === 'currentcolor') {
    return BLACK;
  }
  if (text in namedColors) {
    return (0xff000000 | namedColors[text]) >>> 0;
  }
  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return (0xff000000 | parseInt(digits, 16)) >>> 0;
  }
  return BLACK;
};

const parseAttributes = (source: string): Attributes => {
  const attributes: Attributes = {};
  for (const match of source.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attributes[match[1]] = match[3] ?? match[4] ?? '';
  }
  const style = attributes.style;
  if (style) {
    for (const rule of style.split(';')) {
      const [key, value] = rule.split(':').map((part) => part.trim());
      if (key && value) {
        attributes[key] = value;
      }
    }
  }
  return attributes;
};

const inherit = (parent: Style, attributes: Attributes): Style => ({
  fill: attributes.fill ?? parent.fill,
  stroke: attributes.stroke ?? parent.stroke,
  strokeWidth: attributes['stroke-width'] !== undefined ? Number(attributes['stroke-width']) : parent.strokeWidth,
  cap: (attributes['stroke-linecap'] as Style['cap']) ?? parent.cap,
  join: (attributes['stroke-linejoin'] as Style['join']) ?? parent.join,
  evenOdd: attributes['fill-rule'] !== undefined ? attributes['fill-rule'] === 'evenodd' : parent.evenOdd,
});

const tokenize = (d: string) => d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];

const arcToCurves = (
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  angle: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): number[] => {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) {
    return [LINE, x2, y2];
  }
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const px = cos * dx + sin * dy;
  const py = -sin * dx + cos * dy;
  const lambda = (px * px) / (rx * rx) + (py * py) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const sign = largeArc === sweep ? -1 : 1;
  const numerator = rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px;
  const denominator = rx * rx * py * py + ry * ry * px * px;
  const factor = sign * Math.sqrt(Math.max(0, numerator / denominator));
  const cxp = (factor * rx * py) / ry;
  const cyp = (-factor * ry * px) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angleOf = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const length = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const value = Math.acos(Math.min(1, Math.max(-1, dot / length)));
    return ux * vy - uy * vx < 0 ? -value : value;
  };
  const start = angleOf(1, 0, (px - cxp) / rx, (py - cyp) / ry);
  let delta = angleOf((px - cxp) / rx, (py - cyp) / ry, (-px - cxp) / rx, (-py - cyp) / ry);
  if (!sweep && delta > 0) {
    delta -= 2 * Math.PI;
  } else if (sweep && delta < 0) {
    delta += 2 * Math.PI;
  }
  const segments = Math.ceil(Math.abs(delta) / (Math.PI / 2));
  const step = delta / segments;
  const handle = (4 / 3) * Math.tan(step / 4);
  const out: number[] = [];
  let theta = start;
  const point = (t: number) => [
    cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin,
    cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos,
  ];
  const tangent = (t: number) => [
    -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin,
    -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos,
  ];
  for (let index = 0; index < segments; index++) {
    const next = theta + step;
    const [ax, ay] = point(theta);
    const [bx, by] = point(next);
    const [tax, tay] = tangent(theta);
    const [tbx, tby] = tangent(next);
    out.push(CURVE, ax + handle * tax, ay + handle * tay, bx - handle * tbx, by - handle * tby, bx, by);
    theta = next;
  }
  out[out.length - 2] = x2;
  out[out.length - 1] = y2;
  return out;
};

export const pathCommands = (d: string): number[] => {
  const tokens = tokenize(d);
  const out: number[] = [];
  let index = 0;
  let command = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let controlX = 0;
  let controlY = 0;
  let previous = '';
  const number = () => Number(tokens[index++]);
  const hasNumber = () => index < tokens.length && !/^[a-zA-Z]$/.test(tokens[index]);

  while (index < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[index])) {
      command = tokens[index++];
    } else if (!command) {
      break;
    }
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();
    const ox = relative ? x : 0;
    const oy = relative ? y : 0;

    if (upper === 'Z') {
      out.push(CLOSE);
      x = startX;
      y = startY;
      previous = 'Z';
      continue;
    }
    if (!hasNumber()) {
      break;
    }
    if (upper === 'M') {
      x = ox + number();
      y = oy + number();
      startX = x;
      startY = y;
      out.push(MOVE, x, y);
      command = relative ? 'l' : 'L';
    } else if (upper === 'L') {
      x = ox + number();
      y = oy + number();
      out.push(LINE, x, y);
    } else if (upper === 'H') {
      x = ox + number();
      out.push(LINE, x, y);
    } else if (upper === 'V') {
      y = (relative ? y : 0) + number();
      out.push(LINE, x, y);
    } else if (upper === 'C' || upper === 'S') {
      let c1x: number;
      let c1y: number;
      if (upper === 'C') {
        c1x = ox + number();
        c1y = oy + number();
      } else {
        const smooth = previous === 'C' || previous === 'S';
        c1x = smooth ? 2 * x - controlX : x;
        c1y = smooth ? 2 * y - controlY : y;
      }
      const c2x = ox + number();
      const c2y = oy + number();
      x = ox + number();
      y = oy + number();
      controlX = c2x;
      controlY = c2y;
      out.push(CURVE, c1x, c1y, c2x, c2y, x, y);
    } else if (upper === 'Q' || upper === 'T') {
      let qx: number;
      let qy: number;
      if (upper === 'Q') {
        qx = ox + number();
        qy = oy + number();
      } else {
        const smooth = previous === 'Q' || previous === 'T';
        qx = smooth ? 2 * x - controlX : x;
        qy = smooth ? 2 * y - controlY : y;
      }
      const ex = ox + number();
      const ey = oy + number();
      out.push(
        CURVE,
        x + (2 / 3) * (qx - x),
        y + (2 / 3) * (qy - y),
        ex + (2 / 3) * (qx - ex),
        ey + (2 / 3) * (qy - ey),
        ex,
        ey,
      );
      controlX = qx;
      controlY = qy;
      x = ex;
      y = ey;
    } else if (upper === 'A') {
      const rx = number();
      const ry = number();
      const angle = number();
      const largeArc = number() !== 0;
      const sweep = number() !== 0;
      const ex = ox + number();
      const ey = oy + number();
      out.push(...arcToCurves(x, y, rx, ry, angle, largeArc, sweep, ex, ey));
      x = ex;
      y = ey;
    } else {
      break;
    }
    previous = upper;
  }
  return out;
};

const ellipseCommands = (cx: number, cy: number, rx: number, ry: number) => {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    MOVE,
    cx + rx,
    cy,
    CURVE,
    cx + rx,
    cy + ky,
    cx + kx,
    cy + ry,
    cx,
    cy + ry,
    CURVE,
    cx - kx,
    cy + ry,
    cx - rx,
    cy + ky,
    cx - rx,
    cy,
    CURVE,
    cx - rx,
    cy - ky,
    cx - kx,
    cy - ry,
    cx,
    cy - ry,
    CURVE,
    cx + kx,
    cy - ry,
    cx + rx,
    cy - ky,
    cx + rx,
    cy,
    CLOSE,
  ];
};

const rectCommands = (x: number, y: number, width: number, height: number, rxIn: number, ryIn: number) => {
  const rx = Math.min(rxIn, width / 2);
  const ry = Math.min(ryIn, height / 2);
  if (rx <= 0 || ry <= 0) {
    return [MOVE, x, y, LINE, x + width, y, LINE, x + width, y + height, LINE, x, y + height, CLOSE];
  }
  const kx = rx * (1 - KAPPA);
  const ky = ry * (1 - KAPPA);
  const right = x + width;
  const bottom = y + height;
  return [
    MOVE,
    x + rx,
    y,
    LINE,
    right - rx,
    y,
    CURVE,
    right - kx,
    y,
    right,
    y + ky,
    right,
    y + ry,
    LINE,
    right,
    bottom - ry,
    CURVE,
    right,
    bottom - ky,
    right - kx,
    bottom,
    right - rx,
    bottom,
    LINE,
    x + rx,
    bottom,
    CURVE,
    x + kx,
    bottom,
    x,
    bottom - ky,
    x,
    bottom - ry,
    LINE,
    x,
    y + ry,
    CURVE,
    x,
    y + ky,
    x + kx,
    y,
    x + rx,
    y,
    CLOSE,
  ];
};

const pointsCommands = (points: string, closed: boolean) => {
  const values = (points.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
  const out: number[] = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    out.push(index === 0 ? MOVE : LINE, values[index], values[index + 1]);
  }
  if (closed && out.length > 0) {
    out.push(CLOSE);
  }
  return out;
};

const shapeCommands = (tag: string, a: Attributes): number[] => {
  const n = (key: string, fallback = 0) => (a[key] !== undefined ? Number(a[key]) : fallback);
  switch (tag) {
    case 'path':
      return pathCommands(a.d ?? '');
    case 'circle':
      return ellipseCommands(n('cx'), n('cy'), n('r'), n('r'));
    case 'ellipse':
      return ellipseCommands(n('cx'), n('cy'), n('rx'), n('ry'));
    case 'rect': {
      const rx = a.rx !== undefined ? n('rx') : n('ry');
      const ry = a.ry !== undefined ? n('ry') : rx;
      return rectCommands(n('x'), n('y'), n('width'), n('height'), rx, ry);
    }
    case 'line':
      return [MOVE, n('x1'), n('y1'), LINE, n('x2'), n('y2')];
    case 'polyline':
      return pointsCommands(a.points ?? '', false);
    case 'polygon':
      return pointsCommands(a.points ?? '', true);
    default:
      return [];
  }
};

const shapeTags = ['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'];

export const parseSvg = (markup: string): VectorIcon => {
  const root: Style = { fill: 'black', stroke: 'none', strokeWidth: 1, cap: 'butt', join: 'miter', evenOdd: false };
  const stack: Style[] = [root];
  const layers: VectorLayer[] = [];
  let viewBox: VectorIcon['viewBox'] = [0, 0, 24, 24];

  for (const match of markup.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, body, selfClosing] = match;
    if (closing) {
      if (tag === 'g' || tag === 'svg') {
        stack.pop();
      }
      continue;
    }
    const attributes = parseAttributes(body);
    const style = inherit(stack[stack.length - 1], attributes);
    if (tag === 'svg') {
      const box = attributes.viewBox
        ?.trim()
        .split(/[\s,]+/)
        .map(Number);
      if (box && box.length === 4 && box.every(Number.isFinite)) {
        viewBox = box as VectorIcon['viewBox'];
      } else if (attributes.width && attributes.height) {
        viewBox = [0, 0, Number(attributes.width), Number(attributes.height)];
      }
    }
    if ((tag === 'g' || tag === 'svg') && !selfClosing) {
      stack.push(style);
      continue;
    }
    if (!shapeTags.includes(tag)) {
      continue;
    }
    const commands = shapeCommands(tag, attributes);
    if (commands.length === 0) {
      continue;
    }
    layers.push({
      commands,
      fill: tag === 'line' ? null : parseColor(style.fill),
      stroke: parseColor(style.stroke),
      strokeWidth: style.strokeWidth,
      cap: style.cap,
      join: style.join,
      evenOdd: style.evenOdd,
    });
  }
  return { viewBox, layers };
};
