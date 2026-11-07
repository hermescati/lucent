import { Stack } from 'expo-lucent/navigation';

import { useCompareDriver } from '@/compare/useCompareDriver';
import { PlaygroundProvider } from '@/components/settings';

export default function RootLayout() {
  useCompareDriver();
  // Lucent's stack, so a story outside the tabs slides in and swipes back as on iOS, as every other screen does.
  return (
    <PlaygroundProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PlaygroundProvider>
  );
}
