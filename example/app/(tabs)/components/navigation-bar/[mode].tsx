import { Stack } from 'expo-lucent/navigation';
import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Filler, findMode, ModeDetails, type NavigationBarMode } from '@/components/navigation-bar';
import { Choice, Page, Paragraph, Section, usePalette } from '@/components/ui';

const backdrop = require('@/assets/backdrop.jpg');

export default function NavigationBarModeScreen() {
  const { mode: slug } = useLocalSearchParams<{ mode: string }>();
  const mode = findMode(slug);
  if (!mode) {
    return (
      <Page>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Paragraph>There is no navigation bar mode called “{slug}”.</Paragraph>
      </Page>
    );
  }
  const Screen = screens[mode.slug] ?? Plain;
  return <Screen mode={mode} />;
}

type ScreenProps = { mode: NavigationBarMode };

/** The details, then rows to scroll under the bar. */
const Body = ({ mode, children }: ScreenProps & { children?: ReactNode }) => (
  <Page>
    {children}
    <ModeDetails mode={mode} />
    <Filler />
  </Page>
);

const Plain = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen options={{ title: mode.name }} />
  </Body>
);

const LargeTitle = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen options={{ title: 'Settings', headerLargeTitle: true }} />
  </Body>
);

const InlineTitle = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen options={{ title: 'Details', headerLargeTitle: false }} />
  </Body>
);

// Photos › Collections asks for the large title on the buttons' row. UIKit only does that without a back button, so
// here, with one, it stays under them; the first-screen story shows it on the row.
const InlineLargeTitle = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen options={{ title: 'Collections', headerLargeTitle: true, headerLargeTitleInline: true }} />
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button icon="ellipsis" md="more_horiz" accessibilityLabel="More" onPress={() => {}} />
      <Stack.Toolbar.Button
        icon="person.fill"
        md="person"
        accessibilityLabel="Account"
        separateBackground
        onPress={() => {}}
      />
    </Stack.Toolbar>
  </Body>
);

// Photos › Library, less its "6 Photos" subtitle, which Lucent can't set yet: the large title on the buttons' row,
// with no back button, as on a tab's first screen. Swipe back to leave.
const FirstScreen = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen
      options={{ title: 'Library', headerLargeTitle: true, headerLargeTitleInline: true, headerBackVisible: false }}
    />
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon="line.3.horizontal.decrease"
        md="filter_list"
        accessibilityLabel="Filter"
        onPress={() => {}}
      />
      <Stack.Toolbar.Button onPress={() => {}}>Select</Stack.Toolbar.Button>
    </Stack.Toolbar>
  </Body>
);

const Search = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen options={{ title: 'Browse', headerLargeTitle: false }} />
    <Stack.SearchBar placement="stacked" hideWhenScrolling={false} placeholder="Health" />
  </Body>
);

// Settings: the field under the large title, which scrolls away before the title collapses.
const LargeTitleSearch = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen options={{ title: 'Settings', headerLargeTitle: true }} />
    <Stack.SearchBar placement="stacked" placeholder="Search" />
  </Body>
);

// Files › Recents: a bottom toolbar takes the bottom, so the search button goes up among the bar's items, on their capsule.
// The folder and grid buttons at the bottom are that toolbar. `integratedCentered` draws the same on iPhone.
const SearchPlacements = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen options={{ title: 'Recents', headerLargeTitle: false }} />
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button icon="ellipsis" md="more_horiz" accessibilityLabel="More" onPress={() => {}} />
    </Stack.Toolbar>
    <Stack.Toolbar>
      <Stack.Toolbar.Button icon="folder" md="folder" accessibilityLabel="Browse" onPress={() => {}} />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="square.grid.2x2" md="grid_view" accessibilityLabel="View" onPress={() => {}} />
    </Stack.Toolbar>
    <Stack.SearchBar placement="integratedButton" placeholder="Search" />
  </Body>
);

// No bar: the content runs up under the status bar. Swipe back to leave.
const NoBar = ({ mode }: ScreenProps) => {
  const palette = usePalette();
  return (
    <View style={[styles.fill, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.noBarContent}>
        <Image source={backdrop} style={styles.hero} />
        <View style={styles.noBarBody}>
          <Text style={[styles.headline, { color: palette.text }]}>An article, edge to edge</Text>
          <ModeDetails mode={mode} />
          <Filler />
        </View>
      </ScrollView>
    </View>
  );
};

// Reminders: no title, and three buttons. iOS gives the text button its own capsule without being asked.
const ButtonsOnly = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen options={{ title: '', headerLargeTitle: false }} />
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon="list.bullet.rectangle"
        md="playlist_add"
        accessibilityLabel="Add list"
        onPress={() => {}}
      />
      <Stack.Toolbar.Button onPress={() => {}}>Edit</Stack.Toolbar.Button>
      <Stack.Toolbar.Button icon="magnifyingglass" md="search" accessibilityLabel="Search" onPress={() => {}} />
    </Stack.Toolbar>
  </Body>
);

// Wallet: the plus on its own capsule, the box and the ellipsis sharing one. separateBackground does it; a Spacer is
// there to compare, since in the navigation bar it doesn't split capsules.
const Grouping = ({ mode }: ScreenProps) => {
  const [split, setSplit] = useState<'prop' | 'spacer'>('prop');
  return (
    <Body mode={mode}>
      <Stack.Screen options={{ title: 'Wallet', headerLargeTitle: true }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          md="add"
          accessibilityLabel="Add"
          separateBackground={split === 'prop'}
          onPress={() => {}}
        />
        {split === 'spacer' ? <Stack.Toolbar.Spacer width={8} /> : null}
        <Stack.Toolbar.Button icon="shippingbox" md="package_2" accessibilityLabel="Orders" onPress={() => {}} />
        <Stack.Toolbar.Button icon="ellipsis" md="more_horiz" accessibilityLabel="More" onPress={() => {}} />
      </Stack.Toolbar>
      <Section title="Split the plus off with">
        <Choice
          labels={['separateBackground', 'Spacer']}
          selectedIndex={split === 'prop' ? 0 : 1}
          onSelect={(index) => setSplit(index === 0 ? 'prop' : 'spacer')}
        />
      </Section>
    </Body>
  );
};

// Health › Summary: a coloured top that the bar's scroll edge picks up as it scrolls under.
const ScrollEdge = ({ mode }: ScreenProps) => {
  const [edge, setEdge] = useState<'soft' | 'hard'>('soft');
  return (
    <Body mode={mode}>
      <Stack.Screen options={{ title: 'Summary', headerLargeTitle: true, scrollEdgeEffects: { top: edge } }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="person.fill" md="person" accessibilityLabel="Account" onPress={() => {}} />
      </Stack.Toolbar>
      <View style={styles.colour} />
      <Section title="Top edge">
        <Choice
          labels={['soft', 'hard']}
          selectedIndex={edge === 'soft' ? 0 : 1}
          onSelect={(index) => setEdge(index === 0 ? 'soft' : 'hard')}
        />
      </Section>
    </Body>
  );
};

// Calendar › New Event: close on the left, and the action that ends the screen tinted on the right. Switch it to a text
// button, or to `prominent` in a colour of its own.
const Done = ({ mode }: ScreenProps) => {
  const [kind, setKind] = useState<'icon' | 'text' | 'tinted'>('icon');
  return (
    <Body mode={mode}>
      <Stack.Screen options={{ title: 'New Event', headerLargeTitle: false }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" md="close" accessibilityLabel="Cancel" onPress={() => {}} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {kind === 'icon' ? (
          <Stack.Toolbar.Button
            icon="checkmark"
            md="check"
            accessibilityLabel="Add"
            variant="done"
            onPress={() => {}}
          />
        ) : kind === 'text' ? (
          <Stack.Toolbar.Button variant="done" onPress={() => {}}>
            Add
          </Stack.Toolbar.Button>
        ) : (
          <Stack.Toolbar.Button variant="prominent" tintColor="#F59E0B" onPress={() => {}}>
            Add
          </Stack.Toolbar.Button>
        )}
      </Stack.Toolbar>
      <Section title="The right button">
        <Choice
          labels={['Icon, done', 'Text, done', 'Prominent, tinted']}
          selectedIndex={kind === 'icon' ? 0 : kind === 'text' ? 1 : 2}
          onSelect={(index) => setKind(index === 0 ? 'icon' : index === 1 ? 'text' : 'tinted')}
        />
      </Section>
    </Body>
  );
};

// The back button as each display mode draws it, with a short or a long title for the screen it goes back to.
const BackButtonStyles = ({ mode }: ScreenProps) => {
  const [display, setDisplay] = useState<'default' | 'generic' | 'minimal'>('default');
  const [long, setLong] = useState(false);
  return (
    <Body mode={mode}>
      <Stack.Screen
        options={{
          title: 'Inbox',
          headerLargeTitle: false,
          headerBackButtonDisplayMode: display,
          headerBackTitle: long ? 'All Mailboxes and Smart Folders' : 'Mailboxes',
        }}
      />
      <Section title="Display mode">
        <Choice
          labels={['default', 'generic', 'minimal']}
          selectedIndex={display === 'default' ? 0 : display === 'generic' ? 1 : 2}
          onSelect={(index) => setDisplay(index === 0 ? 'default' : index === 1 ? 'generic' : 'minimal')}
        />
      </Section>
      <Section title="Back title">
        <Choice labels={['Short', 'Long']} selectedIndex={long ? 1 : 0} onSelect={(index) => setLong(index === 1)} />
      </Section>
    </Body>
  );
};

// Mail › Mailboxes: Edit on the leading side. A left item replaces the back button unless the screen asks to keep both,
// as UIKit's leftItemsSupplementBackButton does.
const LeftItems = ({ mode }: ScreenProps) => {
  const [both, setBoth] = useState(false);
  return (
    <Body mode={mode}>
      <Stack.Screen options={{ title: 'Mailboxes', headerLargeTitle: false, headerBackVisible: both }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => {}}>Edit</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="square.and.pencil"
          md="edit_square"
          accessibilityLabel="Compose"
          onPress={() => {}}
        />
      </Stack.Toolbar>
      <Section title="Back button">
        <Choice
          labels={['Replaced', 'Kept beside']}
          selectedIndex={both ? 1 : 0}
          onSelect={(index) => setBoth(index === 1)}
        />
      </Section>
    </Body>
  );
};

// Messages: the contact's initials and name in the title's place.
const Contact = () => {
  const palette = usePalette();
  return (
    <View style={styles.contact}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>JA</Text>
      </View>
      <Text style={[styles.contactName, { color: palette.text }]}>Jane Appleseed</Text>
    </View>
  );
};

const TitleView = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen options={{ headerLargeTitle: false, headerTitle: () => <Contact /> }} />
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button icon="video" md="videocam" accessibilityLabel="FaceTime" onPress={() => {}} />
    </Stack.Toolbar>
  </Body>
);

const Opaque = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen options={{ title: 'Account', headerTransparent: false }} />
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button icon="ellipsis" md="more_horiz" accessibilityLabel="More" onPress={() => {}} />
    </Stack.Toolbar>
  </Body>
);

const OpaqueColour = ({ mode }: ScreenProps) => (
  <Body mode={mode}>
    <Stack.Screen
      options={{
        title: 'Account',
        headerTransparent: false,
        headerStyle: { backgroundColor: '#1D4ED8' },
        headerTintColor: '#FFFFFF',
      }}
    />
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button icon="ellipsis" md="more_horiz" accessibilityLabel="More" onPress={() => {}} />
    </Stack.Toolbar>
  </Body>
);

const screens: Record<string, (props: ScreenProps) => ReactNode> = {
  'large-title': LargeTitle,
  'inline-title': InlineTitle,
  'inline-large-title': InlineLargeTitle,
  'first-screen': FirstScreen,
  search: Search,
  'large-title-search': LargeTitleSearch,
  'search-placements': SearchPlacements,
  'no-bar': NoBar,
  'buttons-only': ButtonsOnly,
  grouping: Grouping,
  'scroll-edge': ScrollEdge,
  done: Done,
  'back-button': BackButtonStyles,
  'left-items': LeftItems,
  'title-view': TitleView,
  opaque: Opaque,
  'opaque-colour': OpaqueColour,
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  noBarContent: { paddingBottom: 32 },
  hero: { width: '100%', height: 320 },
  noBarBody: { padding: 16, gap: 24 },
  headline: { fontSize: 28, fontWeight: '700' },
  contact: { alignItems: 'center', gap: 2 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#8E8E93',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  contactName: { fontSize: 11 },
  colour: { height: 200, borderRadius: 26, borderCurve: 'continuous', backgroundColor: '#C2410C' },
});
