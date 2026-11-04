import { useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { GestureDetector, type TapGesture } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle, type CSSStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Mask, Rect } from 'react-native-svg';

import { clearButton } from '../tokens';

interface Props {
  color: string;
  // Its tap and its look, from `useClearButton`: dimmed under the finger and faded with the text.
  gesture: TapGesture;
  dimStyle: AnimatedStyle<ViewStyle>;
  fadeStyle: CSSStyle<ViewStyle>;
  shown: boolean;
  onClear: () => void;
}

const { size, span, stroke } = clearButton;
const center = size / 2;
const near = center - span / 2;
const far = center + span / 2;

export const ClearButton = ({ color, gesture, dimStyle, fadeStyle, shown, onClear }: Props) => (
  <GestureDetector gesture={gesture}>
    <View
      pointerEvents={shown ? 'auto' : 'none'}
      style={styles.target}
      accessible={shown}
      accessibilityRole="button"
      accessibilityLabel="Clear text"
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={onClear}>
      <Animated.View style={fadeStyle}>
        <Animated.View style={dimStyle}>
          <Glyph color={color} />
        </Animated.View>
      </Animated.View>
    </View>
  </GestureDetector>
);

const Glyph = ({ color }: { color: string }) => {
  const maskId = `clear-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
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
  );
};

const styles = StyleSheet.create({
  target: {
    marginRight: clearButton.inset,
  },
});
