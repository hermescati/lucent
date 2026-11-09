import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { contentColors, description as descriptionText, layout, title as titleText } from './tokens';
import type { ContentUnavailableViewProps } from './types';
import { useLucentTheme } from '../../theme/LucentProvider';

/** iOS's empty state: a grey symbol, a bold title, a grey description and the actions, centred in the space it fills. */
export const ContentUnavailableView = ({
  title,
  md,
  description,
  actions,
  testID,
  style,
}: ContentUnavailableViewProps) => {
  const { scheme } = useLucentTheme();
  const colors = contentColors[scheme];
  return (
    <View testID={testID} style={[styles.fill, !md && styles.lifted, style]}>
      {md ? (
        <SymbolView
          name={{ android: md }}
          size={layout.symbol}
          tintColor={colors.secondary}
          style={[styles.symbol, !title && !description && styles.alone]}
        />
      ) : null}
      {title ? (
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
      ) : null}
      {description ? (
        <Text style={[styles.description, title ? styles.belowTitle : null, { color: colors.secondary }]}>
          {description}
        </Text>
      ) : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.margin,
  },
  lifted: { paddingBottom: layout.lift },
  symbol: { width: layout.symbol, height: layout.symbol, marginBottom: layout.symbolGap },
  alone: { marginBottom: 0 },
  title: {
    fontSize: titleText.fontSize,
    lineHeight: titleText.lineHeight,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  description: {
    fontSize: descriptionText.fontSize,
    lineHeight: descriptionText.lineHeight,
    textAlign: 'center',
    includeFontPadding: false,
  },
  belowTitle: { marginTop: layout.descriptionGap },
  actions: { marginTop: layout.actionsGap, alignItems: 'center' },
});
