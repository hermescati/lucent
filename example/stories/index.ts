import type { Href } from 'expo-router';

import glass from './glass';
import glassContainer from './glass-container';
import segmentedControl from './segmented-control';
import slider from './slider';
import switchStory from './switch';
import type { Story } from './types';

/** Every story, in catalogue order. To add a component, write its story file and list it here. */
export const stories: Story[] = [glass, glassContainer, switchStory, slider, segmentedControl];

export const findStory = (slug: string) => stories.find((story) => story.slug === slug);

export interface Entry {
  name: string;
  summary: string;
  href: Href;
}

/** Components whose demo is a whole screen rather than a story. */
const screens: Entry[] = [
  { name: 'Tab Bar', summary: 'NativeTabs: the floating glass bar this app runs in', href: '/components/tab-bar' },
  { name: 'Search', summary: 'SearchBar: the search tab that morphs into a field', href: '/search' },
];

export const catalogue: Entry[] = [
  ...stories.map((story) => ({
    name: story.name,
    summary: story.summary,
    href: `/components/${story.slug}` as Href,
  })),
  ...screens,
];
