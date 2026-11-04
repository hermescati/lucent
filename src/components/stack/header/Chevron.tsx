import type { ColorValue } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { backButton } from '../tokens';

const { chevronWidth: width, chevronHeight: height, chevronStroke: stroke } = backButton;
const inset = stroke / 2;

/** The back button's chevron, drawn to match SF Symbols' `chevron.left` at the bar's weight. */
export const Chevron = ({ color }: { color: ColorValue }) => (
  <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} pointerEvents="none">
    <Polyline
      points={`${width - inset},${inset} ${inset},${height / 2} ${width - inset},${height - inset}`}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
