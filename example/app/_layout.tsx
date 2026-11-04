import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useCompareDriver } from '@/compare/useCompareDriver';
import { PlaygroundProvider } from '@/components/settings';
import { devRoute } from '@/dev-route';

export default function RootLayout() {
  useCompareDriver();
  // TEMP: iOS reference navigation, remove
  useEffect(() => {
    const id = setTimeout(() => router.navigate(devRoute as never), 300);
    return () => clearTimeout(id);
  }, []);
  return (
    <PlaygroundProvider>
      <Stack key={devRoute} screenOptions={{ headerShown: false }} />
    </PlaygroundProvider>
  );
}
