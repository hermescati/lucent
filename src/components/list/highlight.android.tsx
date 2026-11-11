import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { list } from './tokens';

/**
 * A borderless button in a list, as UIKit highlights one (a header's action, the ⓘ): down, its content drops to
 * `highlight.pressed` at once and holds; let go, it eases back over `highlight.back` (measured on iOS 27.2).
 */
export const HighlightButton = ({ children, ...props }: Omit<PressableProps, 'children'> & { children: ReactNode }) => {
  const shown = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: shown.get() }));
  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        shown.set(list.highlight.pressed);
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        shown.set(withTiming(1, { duration: list.highlight.back, easing: Easing.out(Easing.quad) }));
        props.onPressOut?.(event);
      }}>
      <Animated.View style={style}>{children}</Animated.View>
    </Pressable>
  );
};
