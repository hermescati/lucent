import { Stack, useHeaderInset, useHeaderScroll } from 'expo-lucent/navigation';
import { useEffect } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import { filled, type Comparison } from './types';

const none = () => {};

const Content = ({ scrolled }: { scrolled?: boolean }) => {
  const dark = useColorScheme() === 'dark';
  const scroll = useAnimatedRef<Animated.ScrollView>();
  const onScroll = useHeaderScroll();
  const inset = useHeaderInset();
  useEffect(() => {
    if (!scrolled) return;
    // After the bars have settled the content's insets, which would undo an earlier offset.
    const id = setTimeout(() => scroll.current?.scrollTo({ y: 200, animated: false }), 600);
    return () => clearTimeout(id);
  }, [scrolled, inset]);
  return (
    <Animated.ScrollView
      ref={scroll}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: dark ? '#000000' : '#F2F2F7' }}
      contentContainerStyle={{ paddingTop: inset, paddingBottom: 40 }}>
      <View style={[styles.group, { backgroundColor: dark ? '#1C1C1E' : '#FFFFFF' }]}>
        {Array.from({ length: 30 }, (_, i) => (
          <View key={i} style={[styles.row, i > 0 && styles.rule, { borderTopColor: dark ? '#38383A' : '#C6C6C8' }]}>
            <Text style={[styles.label, { color: dark ? '#FFFFFF' : '#000000' }]}>Row {i + 1}</Text>
          </View>
        ))}
      </View>
    </Animated.ScrollView>
  );
};

// Mail's toolbar: one icon at each end, pushed apart by a flexible spacer.
const Ends = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Inbox' }} />
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

// Three icons sharing one capsule, then a prominent text button on its own.
const Grouped = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Photo' }} />
    <Stack.Toolbar>
      <Stack.Toolbar.Button icon="square.and.arrow.up" md="share" accessibilityLabel="Share" onPress={none} />
      <Stack.Toolbar.Button icon="heart" md="favorite" accessibilityLabel="Favourite" onPress={none} />
      <Stack.Toolbar.Button icon="trash" md="delete" accessibilityLabel="Delete" onPress={none} />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button variant="prominent" onPress={none}>
        Edit
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
    <Content />
  </>
);

// Scrolled, so the list runs under both bars and their scroll edges.
const Scrolled = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Inbox' }} />
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
    <Content scrolled />
  </>
);

// Badges on a bar button and on bottom toolbar buttons: a count and a short word.
const Badges = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Inbox' }} />
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button icon="bell" md="notifications" accessibilityLabel="Alerts" onPress={none}>
        <Stack.Toolbar.Badge>3</Stack.Toolbar.Badge>
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
    <Stack.Toolbar>
      <Stack.Toolbar.Button icon="tray" md="inbox" accessibilityLabel="Inbox" onPress={none}>
        <Stack.Toolbar.Badge>12</Stack.Toolbar.Badge>
      </Stack.Toolbar.Button>
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="square.and.pencil" md="edit_square" accessibilityLabel="Compose" onPress={none}>
        <Stack.Toolbar.Badge>New</Stack.Toolbar.Badge>
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
    <Content />
  </>
);

// The search bar on its own, where iOS puts it for a stack screen.
const Search = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Inbox' }} />
    <Stack.SearchBar placeholder="Search" />
    <Content />
  </>
);

// The search bar in the bottom toolbar, between two buttons.
const SearchSlot = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Inbox' }} />
    <Stack.SearchBar placeholder="Search" />
    <Stack.Toolbar>
      <Stack.Toolbar.Button icon="folder" md="folder" accessibilityLabel="Folders" onPress={none} />
      <Stack.Toolbar.SearchBarSlot />
      <Stack.Toolbar.Button icon="square.and.pencil" md="edit_square" accessibilityLabel="Compose" onPress={none} />
    </Stack.Toolbar>
    <Content />
  </>
);

// A search bar and a bottom toolbar without a slot for it.
const SearchAndToolbar = () => (
  <>
    <Stack.Screen options={{ headerShown: true, title: 'Inbox' }} />
    <Stack.SearchBar placeholder="Search" />
    <Stack.Toolbar>
      <Stack.Toolbar.Button icon="folder" md="folder" accessibilityLabel="Folders" onPress={none} />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="square.and.pencil" md="edit_square" accessibilityLabel="Compose" onPress={none} />
    </Stack.Toolbar>
    <Content />
  </>
);

export default {
  slug: 'toolbar',
  pages: [
    filled(Ends),
    filled(Grouped),
    filled(Scrolled),
    filled(Badges),
    filled(Search),
    filled(SearchSlot),
    filled(SearchAndToolbar),
  ],
} satisfies Comparison;

const styles = StyleSheet.create({
  group: { marginHorizontal: 16, marginTop: 16, borderRadius: 26, overflow: 'hidden' },
  row: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, marginLeft: 16, paddingLeft: 0 },
  label: { fontSize: 17 },
});
