import { useTabTrigger } from 'expo-router/ui';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { TabIcon } from './TabIcon';
import { useTabsTint } from '../../../core/tabs/TabBarReach';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { typography } from '../../../theme/tokens';
import { useMore } from '../helpers/more';
import { layout } from '../tokens';

const { moreList } = layout;

/**
 * More's screen: the tabs that don't fit the bar, as iOS 27 lists them (simulator): plain rows under the status bar,
 * each its tab's icon in the tint, its label and a chevron, hairlines between and around them. Choosing one shows that
 * tab with More still selected in the bar; More again comes back here.
 */
export const MoreList = () => {
  const more = useMore();
  const tint = useTabsTint();
  const { color, scheme } = useLucentTheme(tint);
  const insets = useSafeAreaInsets();
  const { switchTab } = useTabTrigger({ name: more?.overflow[0]?.name ?? '' });
  if (!more?.open || more.overflow.length === 0) {
    return null;
  }
  const colors = moreList.colors[scheme];
  return (
    <ScrollView
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + layout.tabBarHeight }}>
      <View style={[styles.separator, { backgroundColor: colors.separator }]} />
      {more.overflow.map((tab) => (
        <Pressable
          key={tab.name}
          accessibilityRole="button"
          accessibilityLabel={tab.label}
          disabled={tab.disabled}
          onPress={() => {
            more.setOpen(false);
            switchTab(tab.name, {});
          }}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
          <View style={styles.icon}>
            <TabIcon icon={tab.icon} selected={false} size={moreList.iconSize} color={color.tint} />
          </View>
          <Text numberOfLines={1} style={[styles.label, { color: colors.label }]}>
            {tab.label}
          </Text>
          <Svg width={moreList.chevron.width} height={moreList.chevron.height} viewBox="0 0 7 12">
            <Path
              d="M1 1l5 5-5 5"
              stroke={colors.chevron}
              strokeWidth={moreList.chevron.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
          <View style={[styles.separator, styles.rowSeparator, { backgroundColor: colors.separator }]} />
        </Pressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    height: moreList.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: moreList.chevronInset,
  },
  icon: {
    width: moreList.textInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.body,
    flex: 1,
    marginLeft: moreList.labelNudge,
  },
  separator: {
    height: moreList.separator,
    marginLeft: moreList.textInset,
    marginRight: moreList.separatorInset,
  },
  rowSeparator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
