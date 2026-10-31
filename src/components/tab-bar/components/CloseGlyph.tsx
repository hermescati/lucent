import type { ColorValue } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { closeGlyph } from '../tokens';

interface Props {
  size: number;
  color: ColorValue;
}

const { grid, span, stroke } = closeGlyph;
const near = (grid - span) / 2;
const far = (grid + span) / 2;

export const CloseGlyph = ({ size, color }: Props) => (
  <Svg width={size} height={size} viewBox={`0 0 ${grid} ${grid}`} pointerEvents="none">
    <Line x1={near} y1={near} x2={far} y2={far} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    <Line x1={far} y1={near} x2={near} y2={far} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
  </Svg>
);
