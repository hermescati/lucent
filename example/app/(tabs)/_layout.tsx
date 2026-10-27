import { NativeTabs } from 'expo-lucent';

const tabs = [
  { name: 'home', label: 'Home', sf: 'house', md: 'home' },
  { name: 'library', label: 'Library', sf: 'books.vertical', md: 'library_books' },
  { name: 'activity', label: 'Activity', sf: 'chart.bar', md: 'bar_chart' },
  { name: 'profile', label: 'Profile', sf: 'person', md: 'person' },
] as const;

export default function TabsLayout() {
  return (
    <NativeTabs tintColor="#FF8433" minimizeBehavior="onScrollDown">
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          {tab.name === 'library' ? <NativeTabs.Trigger.Badge>3</NativeTabs.Trigger.Badge> : null}
        </NativeTabs.Trigger>
      ))}
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
