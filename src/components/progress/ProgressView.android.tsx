import { StyleSheet, Text, View } from 'react-native';

import { bar, label as labelText, progressColors } from './tokens';
import type { ProgressViewProps } from './types';
import { Spinner, spinner } from '../../core/spinner';
import { useLucentTheme } from '../../theme/LucentProvider';

export const ProgressView = ({ value, label, tintColor, hidden, testID, style }: ProgressViewProps) => {
  const { color, scheme } = useLucentTheme(tintColor);
  const colors = progressColors[scheme];
  const determinate = value != null;
  const fraction = determinate ? Math.min(Math.max(value, 0), 1) : 0;

  if (!determinate) {
    return (
      <View
        testID={testID}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}
        style={[styles.indeterminate, hidden && styles.hidden, style]}>
        <Spinner color={colors.spinner} />
        {label ? (
          <Text numberOfLines={1} style={[styles.label, styles.spinnerLabel, { color: colors.label }]}>
            {label}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      style={[styles.determinate, hidden && styles.hidden, style]}>
      {label ? (
        <Text numberOfLines={1} style={[styles.label, styles.barLabel, { color: colors.text }]}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.track, { backgroundColor: colors.track }]}>
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: color.tint }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  indeterminate: { alignSelf: 'flex-start', alignItems: 'center' },
  determinate: { alignSelf: 'stretch' },
  label: { fontSize: labelText.fontSize, lineHeight: labelText.lineHeight, includeFontPadding: false },
  spinnerLabel: { marginTop: spinner.gap },
  barLabel: { marginBottom: bar.gap },
  track: { height: bar.height, borderRadius: bar.height / 2, overflow: 'hidden' },
  fill: { height: bar.height, borderRadius: bar.height / 2 },
});
