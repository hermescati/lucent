import { NativeTabs } from 'expo-lucent/navigation';
import { usePathname } from 'expo-router';

import { useSettings } from '@/components/settings';

// Screens with a bottom toolbar: the toolbar stories and one navigation bar story. As in Apple's apps, the tab bar steps
// aside for it: in a tab, iOS would draw the tab bar over the toolbar, and Lucent does the same on Android.
const hasToolbar = (pathname: string) =>
  pathname.startsWith('/components/toolbar/') || pathname === '/components/navigation-bar/search-placements';

export default function TabsLayout() {
  const { tint, minimize } = useSettings();
  const pathname = usePathname();
  return (
    <NativeTabs tintColor={tint} minimizeBehavior={minimize} hidden={hasToolbar(pathname)}>
      <NativeTabs.Trigger name="components">
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="widgets" />
        <NativeTabs.Trigger.Label>Components</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="gallery">
        <NativeTabs.Trigger.Icon sf="photo.on.rectangle" md="photo_library" />
        <NativeTabs.Trigger.Label>Gallery</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
