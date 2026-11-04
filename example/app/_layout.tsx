import { Stack } from 'expo-router';

import { useCompareDriver } from '@/compare/useCompareDriver';
import { PlaygroundProvider } from '@/components/settings';

export default function RootLayout() {
  useCompareDriver();
  return (
    <PlaygroundProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PlaygroundProvider>
  );
}
