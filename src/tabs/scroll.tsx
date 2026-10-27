import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { ScrollViewMarker } from 'react-native-screens/experimental';

interface TabScrollMarkerProps {
  children: ReactElement;
}

const nativeProps = { collapsable: false };

export const TabScrollMarker = ({ children }: TabScrollMarkerProps) => (
  <ScrollViewMarker {...nativeProps} style={styles.marker}>
    {children}
  </ScrollViewMarker>
);

export const useTabBarScroll = () => undefined;

export const useTabBarInset = (): number => 0;

const styles = StyleSheet.create({
  marker: {
    flex: 1,
  },
});
