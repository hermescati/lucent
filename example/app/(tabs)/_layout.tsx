import { NativeTabs } from 'expo-lucent';

import { useSettings } from '@/components/settings';

export default function TabsLayout() {
  const { tint, minimize } = useSettings();
  return (
    <NativeTabs tintColor={tint} minimizeBehavior={minimize}>
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
