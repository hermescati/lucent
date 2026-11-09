import type { NativeStackNavigationOptions } from 'expo-router/native-stack';
import { StyleSheet, type ColorValue } from 'react-native';

// Lucent's frame draws the page's background, so it can round it; native-stack's under it is cleared. A
// `contentStyle` background set for one screen alone passes Lucent by, and that screen keeps square corners.
export const pageBackground = 'lucentPageBackground';

// What native-stack paints behind a page: the app's `contentStyle` background, or the theme's, except under a
// transparent modal. Lucent's frame paints it instead, so it can round it.
export const backgroundOf = (options: NativeStackNavigationOptions, fallback: ColorValue): ColorValue | undefined => {
  if (options.presentation === 'transparentModal' || options.presentation === 'containedTransparentModal') {
    return undefined;
  }
  const kept = (options as Record<string, unknown>)[pageBackground] as ColorValue | undefined;
  const own = StyleSheet.flatten(options.contentStyle)?.backgroundColor;
  return kept ?? (own === 'transparent' || own === undefined ? fallback : own);
};
