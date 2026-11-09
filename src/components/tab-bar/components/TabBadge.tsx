import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../../theme/tokens';
import { unmirror } from '../helpers/mirror';
import { layout } from '../tokens';

interface Props {
  text: string;
  color: string;
  textColor: string;
  offsetX?: number;
  rise?: number;
}

const iconCenter = layout.tabIconSize / 2;

export const TabBadge = ({
  text,
  color,
  textColor,
  offsetX = layout.tabBadgeOffsetX,
  rise = layout.tabBadgeRise,
}: Props) => (
  <View
    style={[styles.anchor, { left: iconCenter + offsetX, top: iconCenter - rise - layout.tabBadgeHeight / 2 }]}
    pointerEvents="none">
    <View style={[styles.badge, { backgroundColor: color }]}>
      {text ? (
        <Text style={[styles.text, { color: textColor }, unmirror]} numberOfLines={1} allowFontScaling={false}>
          {text}
        </Text>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    // Room for any badge; it lays out from its left end.
    width: 1000,
    flexDirection: 'row',
  },
  badge: {
    minWidth: layout.tabBadgeHeight,
    height: layout.tabBadgeHeight,
    borderRadius: layout.tabBadgeHeight / 2,
    paddingHorizontal: layout.tabBadgePadding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.badge,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
