import { StyleSheet } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useToolbarOffset } from './offset.android';
import { useTabBarReach } from '../../../core/tabs/TabBarReach';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { BarItems } from '../header/BarItems.android';
import { toolbar } from '../tokens';
import type { LucentToolbarProps } from '../types';

interface Props {
  toolbar: LucentToolbarProps;
  tintColor?: string;
  routeKey: string;
}

/**
 * iOS 26's bottom toolbar: glass capsules floating over the bottom of the content, spread by flexible spacers. It draws
 * after the content, so the content's glass goes under it. It rides above the tab bar as the bar minimizes, and above
 * the keyboard unless `disableImePadding`, as expo-router's Android toolbar does.
 */
export const BottomToolbar = ({ toolbar: props, tintColor, routeKey }: Props) => {
  const { color } = useLucentTheme();
  const rest = useToolbarOffset();
  const tabBar = useTabBarReach();
  const keyboard = useReanimatedKeyboardAnimation().height;
  const followKeyboard = !props.disableImePadding;
  const tint = typeof props.tintColor === 'string' ? props.tintColor : (tintColor ?? color.text);

  const position = useAnimatedStyle(() => {
    const above = tabBar ? tabBar.reach.get() + toolbar.aboveTabBar : rest;
    // keyboard-controller's height is negative while the keyboard is up.
    const typing = followKeyboard ? -keyboard.get() + toolbar.aboveKeyboard : 0;
    return { bottom: Math.max(above, typing) };
  });

  return (
    <Animated.View pointerEvents="box-none" style={[styles.toolbar, position]}>
      <BarItems color={tint} bottom routeKey={routeKey}>
        {props.children}
      </BarItems>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    left: toolbar.margin,
    right: toolbar.margin,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
    elevation: 2,
  },
});
