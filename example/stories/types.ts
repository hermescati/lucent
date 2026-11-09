import type { ReactNode } from 'react';

export type Props = Record<string, unknown>;

interface ControlBase {
  /** Shown under the prop name. */
  detail?: string;
  /** The component's own default. The code sample leaves the prop out while it has this value. */
  fallback?: unknown;
  /** A control for the demo only: passed to `render` and `code`, never printed as a prop. */
  virtual?: boolean;
}

export interface BooleanControl extends ControlBase {
  type: 'boolean';
  default: boolean;
}

export interface NumberControl extends ControlBase {
  type: 'number';
  default: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface Option {
  label: string;
  value: unknown;
}

export interface SelectControl extends ControlBase {
  type: 'select';
  options: Option[];
  /** Index of the option selected at first. */
  default: number;
}

export interface Preset {
  label: string;
  props: Props;
}

/** Sets several props at once, for props that only make sense together (a slider's range). */
export interface PresetControl {
  type: 'preset';
  label: string;
  detail?: string;
  options: Preset[];
  default: number;
  /** The component's own defaults for the props the presets set. */
  fallbacks?: Props;
}

export interface ColorControl extends ControlBase {
  type: 'color';
  /** Starts with no colour when left out. */
  default?: string;
  /** Hex alpha appended to the swatch colour, e.g. `'55'` for a light tint. */
  alpha?: string;
}

export type Control = BooleanControl | NumberControl | SelectControl | PresetControl | ColorControl;

/** A prop the component changes itself, through a callback. */
export interface Binding {
  handler: string;
  /** The handler's code in the sample, when it isn't just the setter (`setValue`). */
  code?: string;
}

export interface StoryContext {
  props: Props;
  set: (patch: Props) => void;
}

/**
 * Where a story sits in the catalogue. Controls are what people press, drag and type into; views show something and
 * hold the controls; materials are the glass the rest is drawn on.
 */
export type Group = 'controls' | 'views' | 'materials' | 'navigation';

export interface Story {
  /** The route: /components/<slug>. */
  slug: string;
  group: Group;
  name: string;
  summary: string;
  /** The component's name in the code sample. */
  component: string;
  controls: Record<string, Control>;
  bindings?: Record<string, Binding>;
  render: (context: StoryContext) => ReactNode;
  /** Replaces the generated code sample. */
  code?: (props: Props) => string;
  stage?: {
    height?: number;
    /** `optional` adds a Plain/Photo choice; `always` suits glass, which needs something to bend. */
    photo?: 'optional' | 'always';
  };
  /** Shown under the props, for hints on how to use the component. */
  footer?: string;
  /** More demos below the code sample. */
  extra?: () => ReactNode;
}

export const story = (definition: Story) => definition;
