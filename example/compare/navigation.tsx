import { Stack, useHeaderInset, useHeaderScroll } from 'expo-lucent/navigation';
import { useEffect, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import { filled, type Comparison } from './types';

const none = () => {};

// An inset grouped list drawn with plain views, so the bar has something to sit over and scroll under.
const Rows = () => {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={[styles.group, { backgroundColor: dark ? '#1C1C1E' : '#FFFFFF' }]}>
      {Array.from({ length: 24 }, (_, i) => (
        <View
          key={i}
          style={[styles.row, i > 0 && { borderTopColor: dark ? '#38383A' : '#C6C6C8' }, i > 0 && styles.rule]}>
          <Text style={[styles.label, { color: dark ? '#FFFFFF' : '#000000' }]}>Row {i + 1}</Text>
        </View>
      ))}
    </View>
  );
};

const Content = ({ scrolled, header }: { scrolled?: boolean; header?: ReactNode }) => {
  const dark = useColorScheme() === 'dark';
  const scroll = useAnimatedRef<Animated.ScrollView>();
  // On Android, Lucent's bar follows this scroll and sits over its top; on iOS UIKit does both itself.
  const onScroll = useHeaderScroll();
  const inset = useHeaderInset();
  useEffect(() => {
    if (!scrolled) return;
    // After the bar has settled the content's inset (on Android, once the header has measured itself, which moves the
    // content); an earlier offset is undone by it. The capture waits longer than this.
    const id = setTimeout(() => scroll.current?.scrollTo({ y: 320, animated: false }), 600);
    return () => clearTimeout(id);
  }, [scrolled, inset]);
  return (
    <Animated.ScrollView
      ref={scroll}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: dark ? '#000000' : '#F2F2F7' }}
      contentContainerStyle={[styles.content, { paddingTop: inset }]}>
      {header}
      <Rows />
    </Animated.ScrollView>
  );
};

const Trailing = () => (
  <Stack.Toolbar placement="right">
    <Stack.Toolbar.Button icon="square.and.arrow.up" md="share" accessibilityLabel="Share" onPress={none} />
    <Stack.Toolbar.Button icon="ellipsis" md="more_horiz" accessibilityLabel="More" onPress={none} />
  </Stack.Toolbar>
);

// The large title at rest, with a back button and two trailing icon buttons.
const Large = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Title', headerLargeTitle: true }} />
    <Trailing />
    <Content />
  </>
);

// Scrolled: the title collapses into the bar and the list runs under it.
const Scrolled = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Title', headerLargeTitle: true }} />
    <Trailing />
    <Content scrolled />
  </>
);

// The inline title, with text buttons on both sides, as on an edit screen.
const Inline = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Edit', headerBackVisible: false }} />
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button onPress={none}>Cancel</Stack.Toolbar.Button>
    </Stack.Toolbar>
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button variant="done" onPress={none}>
        Done
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
    <Content />
  </>
);

// The bar over a photo at the top of the content, where the glass buttons have colour to bend.
const OverPhoto = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: '' }} />
    <Trailing />
    <Content header={<Image source={require('@/assets/backdrop.jpg')} style={styles.photo} />} />
  </>
);

// The chevron alone, as most iOS 26 apps show it, beside an inline title.
const Minimal = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Title', headerBackButtonDisplayMode: 'minimal' }} />
    <Trailing />
    <Content />
  </>
);

// The hard scroll edge: an opaque bar with a line under it, rather than the soft blur.
const HardEdge = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Title', scrollEdgeEffects: { top: 'hard' } }} />
    <Trailing />
    <Content scrolled />
  </>
);

// Search as a magnifier button in the bar, which opens the field.
const SearchButton = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Title' }} />
    <Stack.SearchBar placeholder="Search" placement="integratedButton" />
    <Content />
  </>
);

// The same beside a toolbar item, to show where the button goes among the bar's items.
const SearchButtonWithItems = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Title' }} />
    <Stack.SearchBar placeholder="Search" placement="integratedButton" />
    <Trailing />
    <Content />
  </>
);

// Centred: on iPhone, as the field at the bottom.
const SearchCentred = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Title' }} />
    <Stack.SearchBar placeholder="Search" placement="integratedCentered" />
    <Content />
  </>
);

// Stacked under an inline title: iOS keeps the field out of sight until the list is pulled down.
const SearchStacked = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Title' }} />
    <Stack.SearchBar placeholder="Search" placement="stacked" />
    <Content />
  </>
);

// The search button beside a bottom toolbar's items.
const SearchButtonInToolbar = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Title' }} />
    <Stack.SearchBar placeholder="Search" placement="integratedButton" />
    <Stack.Toolbar>
      <Stack.Toolbar.Button
        icon="line.3.horizontal.decrease"
        md="filter_list"
        accessibilityLabel="Filter"
        onPress={none}
      />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="square.and.pencil" md="edit_square" accessibilityLabel="Compose" onPress={none} />
    </Stack.Toolbar>
    <Content />
  </>
);

export default {
  slug: 'navigation',
  pages: [
    filled(Large),
    filled(Scrolled),
    filled(Inline),
    filled(OverPhoto),
    filled(Minimal),
    filled(HardEdge),
    filled(SearchButton),
    filled(SearchButtonWithItems),
    filled(SearchCentred),
    filled(SearchStacked),
    filled(SearchButtonInToolbar),
  ],
} satisfies Comparison;

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  group: { marginHorizontal: 16, marginTop: 16, borderRadius: 26, overflow: 'hidden' },
  row: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, marginLeft: 16, paddingLeft: 0 },
  label: { fontSize: 17 },
  photo: { width: '100%', height: 320, marginTop: -200 },
});
