import { LucentProvider } from 'expo-lucent';
import { Stack } from 'expo-lucent/navigation';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

// Comparison pages open on top of index, so pages that show the navigation bar have a screen to go back to.
export const unstable_settings = { anchor: 'index' };

export default function CompareLayout() {
  // The navigation theme follows the system, as in an app, so header titles and buttons take the scheme's colours.
  const dark = useColorScheme() === 'dark';
  return (
    // Lucent's defaults, with no accent: outside the tabs iOS uses the system blue, so the Android bar should too.
    <LucentProvider>
      <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </LucentProvider>
  );
}
