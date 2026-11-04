import button from './button';
import contentUnavailable from './content-unavailable';
import glass from './glass';
import glassContainer from './glass-container';
import navigation from './navigation';
import progressView from './progress-view';
import { references } from './references';
import segmentedControl from './segmented-control';
import slider from './slider';
import stepper from './stepper';
import switchComparison from './switch';
import toolbar from './toolbar';
import type { Comparison } from './types';

/** Every component with comparison screens. To add one, write its file and list it here. */
export const comparisons: Comparison[] = [
  glass,
  glassContainer,
  switchComparison,
  slider,
  segmentedControl,
  button,
  navigation,
  toolbar,
  progressView,
  stepper,
  contentUnavailable,
];

export const findComparison = (slug: string) =>
  [...comparisons, ...references].find((comparison) => comparison.slug === slug);
