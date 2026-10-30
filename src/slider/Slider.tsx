import { Host, Slider as ExpoSlider, type SliderProps } from '@expo/ui';
import { StyleSheet } from 'react-native';

export const Slider = (props: SliderProps) => (
  <Host matchContents={{ vertical: true }} style={styles.row}>
    <ExpoSlider {...props} />
  </Host>
);

const styles = StyleSheet.create({
  row: { alignSelf: 'stretch' },
});
