import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** The playground's backdrop photo behind a group, for glass that needs something to bend. */
export const Photo = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.panel, style]}>
    <Image source={require('@/assets/backdrop.jpg')} style={StyleSheet.absoluteFill} />
    {children}
  </View>
);

const styles = StyleSheet.create({
  panel: { borderRadius: 24, overflow: 'hidden', padding: 16, gap: 12 },
});
