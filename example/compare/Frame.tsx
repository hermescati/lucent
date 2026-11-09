import { GlassBackdrop, LucentProvider } from 'expo-lucent';
import type { ReactNode } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/** Where every comparison page starts, in points, below any status bar on either platform. */
export const compareTop = 120;
/**
 * The page's width in points: the iPhone 18 Pro's 402 less the margins. Phones differ in width (the Pixel 9 Pro is 426),
 * and full-width controls would otherwise stretch differently on each.
 */
export const compareWidth = 402 - 32;

/**
 * A plain page for captures: the system grouped background, no header, content at a fixed offset, and Lucent's default
 * theme. With no `tintColor`, both platforms use the system blue, as iOS does outside `NativeTabs`.
 */
export const Frame = ({ children, fill }: { children: ReactNode; fill?: boolean }) => {
  const dark = useColorScheme() === 'dark';
  return (
    // Outside NativeTabs nothing else provides the gesture root that Lucent's Android controls need.
    <GestureHandlerRootView style={styles.page}>
      <LucentProvider>
        <GlassBackdrop style={styles.page}>
          {/* A child, not the backdrop's own background: Android's glass refracts only what the backdrop draws inside.
              A page that fills the screen draws its own, so its scroll view stays first, where UIKit's navigation bar
              looks for the one to follow. */}
          {fill ? null : <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? '#000000' : '#F2F2F7' }]} />}
          <View style={fill ? StyleSheet.absoluteFill : styles.content}>{children}</View>
        </GlassBackdrop>
      </LucentProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { marginTop: compareTop, marginLeft: 16, width: compareWidth, gap: 12 },
});
