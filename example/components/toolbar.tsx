import type { Href } from 'expo-router';

import type { Support } from '@/components/navigation-bar';

/** The index's sections, in order. */
export const toolbarGroups = [
  { key: 'buttons', title: 'Buttons' },
  { key: 'layout', title: 'Layout' },
  { key: 'search', title: 'Search' },
] as const;

export interface ToolbarMode {
  slug: string;
  group: (typeof toolbarGroups)[number]['key'];
  name: string;
  summary: string;
  /** Apple apps that use it, to compare against. */
  apple: string;
  /** What UIKit sets for it. */
  uikit: string;
  /** The expo-router components that ask for it, as shown in the code sample. */
  code: string;
  support: Support;
  /** Why the support is what it is, or what to look for. */
  gap?: string;
}

/**
 * Every look the iOS 26 bottom toolbar takes in Apple's apps. One screen each, with the tab bar hidden as Apple's apps
 * hide it under a toolbar, so the playground can be held up against the Apple app on both platforms.
 */
export const toolbarModes: ToolbarMode[] = [
  {
    slug: 'icons',
    group: 'buttons',
    name: 'Icons, spread out',
    summary: 'Glass circles and capsules pushed apart by spacers',
    apple: 'Mail, Notes, Files',
    uikit: 'UIToolbar items with flexible spaces; neighbouring icons share a capsule (iOS 26)',
    code: `<Stack.Toolbar>
  <Stack.Toolbar.Button icon="line.3.horizontal.decrease" md="filter_list" />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button icon="square.and.arrow.up" md="share" />
  <Stack.Toolbar.Button icon="trash" md="delete" />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button icon="square.and.pencil" md="edit_square" />
</Stack.Toolbar>`,
    support: 'both',
    gap: 'The filter button opens a menu. On Android the toolbar rises with the keyboard, as expo-router’s Android toolbar does; disableImePadding keeps it down.',
  },
  {
    slug: 'text',
    group: 'buttons',
    name: 'Text buttons',
    summary: 'Words instead of symbols, each on its own capsule',
    apple: 'Mail › Edit (Mark All, Move, Trash)',
    uikit: 'UIBarButtonItem(title:)',
    code: `<Stack.Toolbar>
  <Stack.Toolbar.Button>Mark All</Stack.Toolbar.Button>
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button>Move</Stack.Toolbar.Button>
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button>Trash</Stack.Toolbar.Button>
</Stack.Toolbar>`,
    support: 'both',
  },
  {
    slug: 'prominent',
    group: 'buttons',
    name: 'Prominent action',
    summary: 'A tinted capsule for the screen’s main action',
    apple: 'Reminders, Calendar',
    uikit: 'UIBarButtonItem.Style.prominent (iOS 26)',
    code: `<Stack.Toolbar>
  <Stack.Toolbar.Button icon="calendar" md="calendar_today" />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button icon="plus" md="add" variant="prominent" />
</Stack.Toolbar>`,
    support: 'both',
  },
  {
    slug: 'states',
    group: 'buttons',
    name: 'Disabled and hidden items',
    summary: 'Actions that wait for a selection',
    apple: 'Photos › Select, Mail › Edit',
    uikit: 'UIBarButtonItem.isEnabled, isHidden (iOS 16)',
    code: `<Stack.Toolbar>
  <Stack.Toolbar.Button icon="square.and.arrow.up" md="share" disabled={!selected} />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button icon="trash" md="delete" disabled={!selected} />
  <Stack.Toolbar.Button icon="heart" md="favorite" hidden={!selected} />
</Stack.Toolbar>`,
    support: 'both',
  },
  {
    slug: 'status',
    group: 'layout',
    name: 'A status in the middle',
    summary: 'Text between the buttons, without glass',
    apple: 'Mail (Updated Just Now), Notes (12 Notes)',
    uikit: 'A UIBarButtonItem with a custom view, hidesSharedBackground (iOS 26)',
    code: `<Stack.Toolbar>
  <Stack.Toolbar.Button icon="line.3.horizontal.decrease" md="filter_list" />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.View hidesSharedBackground>
    <View style={{ width: 160, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Updated Just Now</Text>
    </View>
  </Stack.Toolbar.View>
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button icon="square.and.pencil" md="edit_square" />
</Stack.Toolbar>`,
    support: 'both',
    gap: 'Give the view a width and height. On iOS a custom view takes its frame from its content, and React Native content has no size of its own there, so without them the toolbar draws nothing in its place. Lucent on Android draws it either way.',
  },
  {
    slug: 'spacing',
    group: 'layout',
    name: 'Fixed spacing',
    summary: 'A fixed gap splits a capsule in two',
    apple: 'Photos viewer (share; heart, info, adjust; trash)',
    uikit: 'UIBarButtonItem.fixedSpace(_:)',
    code: `<Stack.Toolbar>
  <Stack.Toolbar.Button icon="square.and.arrow.up" md="share" />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button icon="heart" md="favorite" />
  <Stack.Toolbar.Spacer width={16} />
  <Stack.Toolbar.Button icon="info.circle" md="info" />
  <Stack.Toolbar.Button icon="slider.horizontal.3" md="tune" />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button icon="trash" md="delete" />
</Stack.Toolbar>`,
    support: 'both',
  },
  {
    slug: 'search',
    group: 'search',
    name: 'Search in the toolbar',
    summary: 'The search field takes the toolbar’s middle',
    apple: 'Notes, Mail (iOS 26)',
    uikit: 'UINavigationItem.searchBarPlacementBarButtonItem (iOS 26)',
    code: `<Stack.SearchBar placeholder="Search" />
<Stack.Toolbar>
  <Stack.Toolbar.Button icon="line.3.horizontal.decrease" md="filter_list" />
  <Stack.Toolbar.SearchBarSlot />
  <Stack.Toolbar.Button icon="square.and.pencil" md="edit_square" />
</Stack.Toolbar>`,
    support: 'both',
    gap: 'The field itself is still the TextInput that the search rebuild will replace.',
  },
];

export const findToolbarMode = (slug: string) => toolbarModes.find((mode) => mode.slug === slug);

export const toolbarModeHref = (mode: ToolbarMode): Href => `/components/toolbar/${mode.slug}` as Href;
