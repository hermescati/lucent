import type { GlassFallback } from 'expo-lucent';
import { Stack, TabScrollView } from 'expo-lucent/navigation';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import type { AccessoryKind } from '@/components/accessories';
import { useSettings, type SearchPlacement, type TabCount } from '@/components/settings';

// A flat colour under the bars, for measuring how much of what's behind them the glass lets through:
// lucent-example://components/backdrop/000000. The tab bar story's settings can ride along, to measure each layout:
// ?tabs=4&search=tab&prominent=1&accessory=playing&fallback=android12. With &scroll=1 it scrolls, to minimize and expand the bar over it.
export default function BackdropScreen() {
  const { color, tabs, search, prominent, accessory, scroll, fallback } = useLocalSearchParams<{
    color: string;
    fallback?: GlassFallback;
    scroll?: string;
    tabs?: string;
    search?: SearchPlacement;
    prominent?: string;
    accessory?: AccessoryKind;
  }>();
  const settings = useSettings();
  const patch = {
    ...(tabs ? { tabs: Number(tabs) as TabCount } : {}),
    ...(search ? { search } : {}),
    ...(prominent ? { prominent: prominent === '1' } : {}),
    ...(accessory ? { accessory } : {}),
    ...(fallback ? { glassFallback: fallback } : {}),
  };
  // Only what differs: a new layout can remount this screen, which would set it again.
  const changed = Object.entries(patch).some(([key, value]) => settings[key as keyof typeof patch] !== value);
  useEffect(() => {
    if (changed) settings.set(patch);
  }, [changed, tabs, search, prominent, accessory]);
  return (
    <>
      <Stack.Screen options={{ title: '', headerTransparent: true }} />
      {scroll ? (
        <TabScrollView style={{ backgroundColor: `#${color}` }}>
          <View style={{ height: 4000 }} />
        </TabScrollView>
      ) : (
        <View style={{ flex: 1, backgroundColor: `#${color}` }} />
      )}
    </>
  );
}
