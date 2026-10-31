import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../../theme/tokens';
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
        <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
          {text}
        </Text>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    width: layout.tabBarMaxWidth,
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
