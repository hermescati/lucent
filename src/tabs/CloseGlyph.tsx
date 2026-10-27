import { StyleSheet, View, type ColorValue } from 'react-native';

import { closeGlyph } from '../theme/tokens';

interface Props {
  size: number;
  color: ColorValue;
}

export const CloseGlyph = ({ size, color }: Props) => {
  const unit = size / closeGlyph.grid;
  const length = closeGlyph.span * Math.SQRT2 * unit;
  const thickness = closeGlyph.stroke * unit;
  const bar = {
    width: length + thickness,
    height: thickness,
    borderRadius: thickness / 2,
    backgroundColor: color,
  };

  return (
    <View style={[styles.box, { width: size, height: size }]} pointerEvents="none">
      <View style={[styles.bar, bar, styles.forward]} />
      <View style={[styles.bar, bar, styles.back]} />
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
  },
  forward: {
    transform: [{ rotate: '45deg' }],
  },
  back: {
    transform: [{ rotate: '-45deg' }],
  },
});
