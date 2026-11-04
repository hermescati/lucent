import type { Href } from 'expo-router';

import { Code, Row, Section } from '@/components/ui';

/** How far Lucent gets on Android, and whether Expo can reach it on iOS at all. */
export type Support = 'both' | 'partly' | 'ios-only' | 'neither';

/** The index's sections, in order. */
export const groups = [
  { key: 'title', title: 'Title' },
  { key: 'buttons', title: 'Buttons' },
  { key: 'search', title: 'Search' },
  { key: 'background', title: 'Background' },
] as const;

export interface NavigationBarMode {
  slug: string;
  group: (typeof groups)[number]['key'];
  name: string;
  summary: string;
  /** Apple apps that use it, to compare against. */
  apple: string;
  /** What UIKit sets for it. */
  uikit: string;
  /** The expo-router options or components that ask for it, as shown in the code sample. */
  code: string;
  support: Support;
  /** Why the support is what it is, when it isn't both. */
  gap?: string;
  href?: Href;
}

/**
 * Every look the iOS 26 navigation bar takes in Apple's apps, and the setting behind it. One screen each, so the
 * playground can be held up against the Apple app on both platforms.
 */
export const modes: NavigationBarMode[] = [
  {
    slug: 'large-title',
    group: 'title',
    name: 'Large title',
    summary: 'Shrinks into the bar as you scroll',
    apple: 'Settings, Health',
    uikit: 'largeTitleDisplayMode = .always',
    code: `<Stack.Screen options={{ title: 'Settings', headerLargeTitle: true }} />`,
    support: 'both',
  },
  {
    slug: 'inline-title',
    group: 'title',
    name: 'Inline title',
    summary: 'A small centred title, from the start',
    apple: 'Health › Browse, pushed pages everywhere',
    uikit: 'largeTitleDisplayMode = .never',
    code: `<Stack.Screen options={{ title: 'Details', headerLargeTitle: false }} />`,
    support: 'both',
  },
  {
    slug: 'inline-large-title',
    group: 'title',
    name: 'Large title beside the buttons',
    summary: 'Asked for, with a back button: it stays under them',
    apple: 'Photos › Collections, Wallet',
    uikit: 'largeTitleDisplayMode = .inline (iOS 17+), which reverts to .always with a back button',
    code: `// With a back button, UIKit keeps the large title under the row. On a first screen it goes beside the buttons.
<Stack.Screen options={{ title: 'Collections', headerLargeTitle: true, headerLargeTitleInline: true }} />`,
    support: 'both',
  },
  {
    slug: 'first-screen',
    group: 'title',
    name: 'Large title on a first screen',
    summary: 'Beside the buttons, with no back button',
    apple: 'Photos › Library',
    uikit: 'largeTitleDisplayMode = .inline (iOS 17+), on a screen without a back button',
    code: `<Stack.Screen
  options={{ title: 'Library', headerLargeTitle: true, headerLargeTitleInline: true, headerBackVisible: false }}
/>`,
    support: 'both',
    gap: "Photos also puts \"6 Photos\" under the title: navigationItem.subtitle (iOS 26), which expo-router has no option for. Set on UIKit's navigation item from Lucent, a pushed screen comes in with its large title collapsed under expo-router's stack, though not in plain UIKit; react-native-screens' newer stack has subtitles of its own. Lucent waits for expo-router to move to it, rather than ship it on Android alone.",
  },
  {
    slug: 'search',
    group: 'search',
    name: 'Search under the title',
    summary: 'The search field in the bar, below the title',
    apple: 'Health › Browse',
    uikit: 'preferredSearchBarPlacement = .stacked',
    code: `<Stack.Screen options={{ title: 'Browse', headerLargeTitle: false }} />
<Stack.SearchBar placement="stacked" hideWhenScrolling={false} placeholder="Health" />`,
    support: 'both',
  },
  {
    slug: 'large-title-search',
    group: 'search',
    name: 'Large title with search',
    summary: 'The field under a large title, scrolling away first',
    apple: 'Settings, Mail',
    uikit: 'largeTitleDisplayMode = .always, with a search controller',
    code: `<Stack.Screen options={{ title: 'Settings', headerLargeTitle: true }} />
<Stack.SearchBar placement="stacked" placeholder="Search" />`,
    support: 'both',
  },
  {
    slug: 'search-placements',
    group: 'search',
    name: 'Search beside a toolbar',
    summary: 'With a bottom toolbar, search goes up into the bar',
    apple: 'Files › Recents, Mail with its toolbar',
    uikit: 'preferredSearchBarPlacement = .integratedButton / .integratedCentered (iOS 26)',
    code: `<Stack.Toolbar>
  <Stack.Toolbar.Button icon="folder" md="folder" />
</Stack.Toolbar>
<Stack.SearchBar placement="integratedButton" placeholder="Search" />`,
    support: 'both',
    gap: "The folder and grid buttons at the bottom are the screen's bottom toolbar: with it there, search goes up into the navigation bar as a magnifier on the trailing buttons' capsule. integratedCentered draws the same on iPhone. The tab bar hides on this screen, as in Apple's apps, so the toolbar has the bottom. The magnifier opens the field in the bar: its capsule stretches left into it, and the close button buds off at its end.",
  },
  {
    slug: 'search-bottom',
    group: 'search',
    name: 'Search at the bottom',
    summary: 'With no tab bar or toolbar, the field floats at the bottom',
    apple: 'Notes, Mail (iOS 26 on iPhone)',
    uikit: 'preferredSearchBarPlacement = .automatic, no toolbar or tab bar (iOS 26)',
    href: '/standalone/search-bottom',
    code: `<Stack.Screen options={{ title: 'Notes' }} />
<Stack.SearchBar placeholder="Search" />`,
    support: 'both',
    gap: "This story opens outside the tabs, as its stack's first screen: swipe back to return. In a tab, iOS 26 puts the field under the title instead, hidden until pulled down, as in Large title with search.",
  },
  {
    slug: 'search-button',
    group: 'search',
    name: 'Search button at the bottom',
    summary: 'With no tab bar or toolbar, a glass magnifier that opens the field',
    apple: 'Wallet, Journal (iOS 26 on iPhone)',
    uikit: 'preferredSearchBarPlacement = .integratedButton, no toolbar or tab bar (iOS 26)',
    href: '/standalone/search-button',
    code: `<Stack.SearchBar placement="integratedButton" placeholder="Search" />`,
    support: 'both',
    gap: "This story opens outside the tabs, as its stack's first screen: swipe back to return. In a tab, iOS 26 puts the magnifier in the navigation bar instead, on the trailing side.",
  },
  {
    slug: 'no-bar',
    group: 'background',
    name: 'No bar',
    summary: 'Content runs up under the status bar',
    apple: 'News articles, Photos viewer',
    uikit: 'setNavigationBarHidden(true)',
    code: `<Stack.Screen options={{ headerShown: false }} />`,
    support: 'both',
  },
  {
    slug: 'buttons-only',
    group: 'buttons',
    name: 'Buttons, no title',
    summary: 'Bar buttons floating over the content',
    apple: 'Reminders, News › Following',
    uikit: 'An empty title, with bar button items',
    code: `<Stack.Screen options={{ title: '', headerLargeTitle: false }} />
<Stack.Toolbar placement="right">
  <Stack.Toolbar.Button icon="list.bullet.rectangle" md="playlist_add" />
  <Stack.Toolbar.Button>Edit</Stack.Toolbar.Button>
  <Stack.Toolbar.Button icon="magnifyingglass" md="search" />
</Stack.Toolbar>`,
    support: 'both',
  },
  {
    slug: 'grouping',
    group: 'buttons',
    name: 'Button grouping',
    summary: 'Which buttons share a glass capsule',
    apple: 'Wallet, Photos',
    uikit: 'UIBarButtonItem.sharesBackground and hidesSharedBackground (iOS 26)',
    code: `<Stack.Toolbar placement="right">
  <Stack.Toolbar.Button icon="plus" md="add" separateBackground />
  <Stack.Toolbar.Button icon="shippingbox" md="package_2" />
  <Stack.Toolbar.Button icon="ellipsis" md="more_horiz" />
</Stack.Toolbar>`,
    support: 'both',
    gap: "Icon buttons share a capsule until one has separateBackground; a text button always gets its own. A Spacer doesn't split them in the navigation bar, on either platform: switch to it on this screen to see. It only does in the bottom toolbar.",
  },
  {
    slug: 'badges',
    group: 'buttons',
    name: 'Badges and views',
    summary: 'A count on a button, and a bare view beside the buttons',
    apple: 'Music (profile), Mail (unread count)',
    uikit: 'UIBarButtonItem.badge and a custom view with hidesSharedBackground (iOS 26)',
    code: `<Stack.Toolbar placement="right">
  <Stack.Toolbar.Button icon="bell" md="notifications">
    <Stack.Toolbar.Badge>3</Stack.Toolbar.Badge>
  </Stack.Toolbar.Button>
  <Stack.Toolbar.View hidesSharedBackground>
    <Avatar />
  </Stack.Toolbar.View>
</Stack.Toolbar>`,
    support: 'both',
  },
  {
    slug: 'done',
    group: 'buttons',
    name: 'Done and prominent buttons',
    summary: 'A tinted capsule for the action that ends the screen',
    apple: 'Notes, Calendar › New Event, Reminders',
    uikit: 'UIBarButtonItem.Style.done / .prominent (iOS 26)',
    code: `<Stack.Toolbar placement="left">
  <Stack.Toolbar.Button icon="xmark" md="close" />
</Stack.Toolbar>
<Stack.Toolbar placement="right">
  <Stack.Toolbar.Button icon="checkmark" md="check" variant="done" />
</Stack.Toolbar>`,
    support: 'both',
  },
  {
    slug: 'back-button',
    group: 'buttons',
    name: 'Back button styles',
    summary: 'The previous title, “Back”, or the chevron alone',
    apple: 'Settings › General, Mail › Mailboxes',
    uikit: 'UINavigationItem.backButtonDisplayMode, backButtonTitle',
    code: `<Stack.Screen options={{ headerBackButtonDisplayMode: 'generic', headerBackTitle: 'Mailboxes' }} />`,
    support: 'both',
  },
  {
    slug: 'left-items',
    group: 'buttons',
    name: 'Buttons on the left',
    summary: 'Items on the leading side, in place of or beside the back button',
    apple: 'Mail › Mailboxes (Edit), Notes › Folders',
    uikit: 'UINavigationItem.leftBarButtonItems, leftItemsSupplementBackButton',
    code: `<Stack.Toolbar placement="left">
  <Stack.Toolbar.Button>Edit</Stack.Toolbar.Button>
</Stack.Toolbar>`,
    support: 'both',
  },
  {
    slug: 'title-view',
    group: 'title',
    name: 'A view for the title',
    summary: 'Anything in the title’s place, centred in the bar',
    apple: 'Messages › a conversation, Photos › Years/Months/All',
    uikit: 'UINavigationItem.titleView',
    code: `<Stack.Screen options={{ headerTitle: () => <Contact /> }} />`,
    support: 'both',
  },
  {
    slug: 'opaque',
    group: 'background',
    name: 'Opaque bar',
    summary: 'A solid bar, with the content below it',
    apple: 'Older-style apps, and apps with a brand colour',
    uikit: 'UINavigationBarAppearance.configureWithOpaqueBackground()',
    code: `<Stack.Screen options={{ title: 'Account', headerTransparent: false }} />`,
    support: 'both',
  },
  {
    slug: 'opaque-colour',
    group: 'background',
    name: 'Coloured bar',
    summary: 'A bar in a colour of its own',
    apple: 'Third-party apps with a brand bar',
    uikit: 'UINavigationBarAppearance.backgroundColor',
    code: `<Stack.Screen
  options={{
    title: 'Account',
    headerTransparent: false,
    headerStyle: { backgroundColor: '#1D4ED8' },
    headerTintColor: '#FFFFFF',
  }}
/>`,
    support: 'both',
  },
  {
    slug: 'scroll-edge',
    group: 'background',
    name: 'Scroll edge',
    summary: 'The content’s colour behind the bar',
    apple: 'Health › Summary, Photos › Library',
    uikit: 'UIScrollEdgeEffect, soft by default (iOS 26)',
    code: `<Stack.Screen options={{ scrollEdgeEffects: { top: 'hard' } }} />`,
    support: 'both',
  },
];

export const findMode = (slug: string) => modes.find((mode) => mode.slug === slug);

export const modeHref = (mode: NavigationBarMode): Href =>
  mode.href ?? (`/components/navigation-bar/${mode.slug}` as Href);

const supportLabels: Record<Support, string> = {
  both: 'Both platforms',
  partly: 'Partly on Android',
  'ios-only': 'iOS only',
  neither: 'Neither: no Expo option',
};

/** What the screen shows, where Apple uses it, and how far Lucent gets. */
export const ModeDetails = ({
  mode,
}: {
  mode: Pick<NavigationBarMode, 'apple' | 'uikit' | 'support' | 'gap' | 'code'>;
}) => (
  <>
    <Section footer={mode.gap}>
      <Row label="Apple uses it in" detail={mode.apple} />
      <Row label="UIKit" detail={mode.uikit} />
      <Row label="Lucent" detail={supportLabels[mode.support]} last />
    </Section>
    <Code>{mode.code}</Code>
  </>
);

const rows = Array.from({ length: 16 }, (_, index) => `Row ${index + 1}`);

/** Something to scroll, so the bar's scroll behaviour shows. */
export const Filler = () => (
  <Section title="Scroll under the bar">
    {rows.map((row, index) => (
      <Row key={row} label={row} last={index === rows.length - 1} />
    ))}
  </Section>
);
