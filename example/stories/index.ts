import type { Href } from 'expo-router';

import button from './button';
import contentUnavailable from './content-unavailable';
import glass from './glass';
import glassContainer from './glass-container';
import progressView from './progress-view';
import segmentedControl from './segmented-control';
import slider from './slider';
import stepper from './stepper';
import switchStory from './switch';
import type { Group, Story } from './types';

/** Every story, in catalogue order. To add a component, write its story file and list it here. */
export const stories: Story[] = [
  glass,
  glassContainer,
  switchStory,
  slider,
  segmentedControl,
  button,
  progressView,
  stepper,
  contentUnavailable,
];

export const findStory = (slug: string) => stories.find((story) => story.slug === slug);

export interface Entry {
  name: string;
  summary: string;
  href: Href;
  group: Group;
}

/** Components whose demo is a whole screen rather than a story. */
const screens: Entry[] = [
  {
    name: 'Navigation Bar',
    summary: 'Stack: every look of the iOS 26 bar, and how to get it',
    href: '/components/navigation-bar',
    group: 'navigation',
  },
  {
    name: 'Toolbar',
    summary: 'Stack.Toolbar: glass buttons floating at the bottom',
    href: '/components/toolbar',
    group: 'navigation',
  },
  {
    name: 'Tab Bar',
    summary: 'NativeTabs: the floating glass bar this app runs in',
    href: '/components/tab-bar',
    group: 'navigation',
  },
  {
    name: 'Search',
    summary: 'SearchBar: the search tab that morphs into a field',
    href: '/search',
    group: 'navigation',
  },
];

/** Every entry, in no particular order: what search looks through. */
export const entries: Entry[] = [
  ...stories.map((story) => ({
    name: story.name,
    summary: story.summary,
    href: `/components/${story.slug}` as Href,
    group: story.group,
  })),
  ...screens,
];

const groups: { group: Group; title: string }[] = [
  { group: 'navigation', title: 'Navigation' },
  { group: 'controls', title: 'Controls' },
  { group: 'views', title: 'Views' },
  { group: 'materials', title: 'Materials' },
];

/** The catalogue's sections, in order, each with its entries. */
export const catalogue = groups.map(({ group, title }) => ({
  title,
  entries: entries.filter((entry) => entry.group === group),
}));
