import { Pressable, StyleSheet, View } from 'react-native';

import { clearButton } from '../theme/tokens';

interface Props {
  color: string;
  glyphColor: string;
  onPress: () => void;
}

export const ClearButton = ({ color, glyphColor, onPress }: Props) => (
  <Pressable
    style={styles.target}
    onPress={onPress}
    hitSlop={clearButton.hitSlop}
    accessibilityRole="button"
    accessibilityLabel="Clear text">
    <View style={[styles.circle, { backgroundColor: color }]}>
      <View style={[styles.bar, styles.forward, { backgroundColor: glyphColor }]} />
      <View style={[styles.bar, styles.back, { backgroundColor: glyphColor }]} />
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  target: {
    marginRight: clearButton.inset,
  },
  circle: {
    width: clearButton.size,
    height: clearButton.size,
    borderRadius: clearButton.size / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    width: clearButton.span * Math.SQRT2 + clearButton.stroke,
    height: clearButton.stroke,
    borderRadius: clearButton.stroke / 2,
  },
  forward: {
    transform: [{ rotate: '45deg' }],
  },
  back: {
    transform: [{ rotate: '-45deg' }],
  },
});
