import type { ComponentType } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';

import { createLucentContext } from '../theme/context';

/**
 * The scroll view a Lucent list scrolls in on Android. Plain by default; inside Lucent's `Stack` or `NativeTabs` the
 * navigation entry puts its own here, which collapses the large title, minimizes the tab bar and clears the bars, so a
 * list on a screen behaves as a SwiftUI list does under UIKit's bars. The root entry, which a list is in, never
 * imports the navigation entry's peers.
 */
export const ListScrollViewContext = createLucentContext<ComponentType<ScrollViewProps>>('ListScrollView', ScrollView);
