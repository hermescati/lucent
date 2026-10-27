import { useId } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Line, Mask, Rect } from 'react-native-svg';

import { clearButton } from '../theme/tokens';

interface Props {
  color: string;
  onPress: () => void;
}

const { size, span, stroke } = clearButton;
const center = size / 2;
const near = center - span / 2;
const far = center + span / 2;

export const ClearButton = ({ color, onPress }: Props) => {
  const maskId = `clear-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <Pressable
      style={styles.target}
      onPress={onPress}
      hitSlop={clearButton.hitSlop}
      accessibilityRole="button"
      accessibilityLabel="Clear text">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <Mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={size} height={size}>
            <Rect x={0} y={0} width={size} height={size} fill="#FFFFFF" />
            <Line x1={near} y1={near} x2={far} y2={far} stroke="#000000" strokeWidth={stroke} strokeLinecap="round" />
            <Line x1={far} y1={near} x2={near} y2={far} stroke="#000000" strokeWidth={stroke} strokeLinecap="round" />
          </Mask>
        </Defs>
        <Circle cx={center} cy={center} r={center} fill={color} mask={`url(#${maskId})`} />
      </Svg>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  target: {
    marginRight: clearButton.inset,
  },
});
