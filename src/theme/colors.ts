import type { LucentScheme } from './tokens';

export interface LucentColors {
  tint: string;
  text: string;
  placeholder: string;
  placeholderActive: string;
  barTint: string;
  // The bar drawn solid (below Android 13, or with high-contrast text): its fill, its selected pill, its shadow, and
  // the tabs that aren't selected, as One UI 9 paints its own bar.
  barFallback: string;
  barFallbackPill: string;
  barFallbackShadow: string;
  barFallbackRim: string;
  // A tab that isn't selected: the text colour on glass, a grey on the solid bar.
  tabInk: string;
  barShadow: string;
  lens: string;
  lensActive: string;
  lensRim: string;
  lensRimEarly: string;
  lensTint: string;
  lensTintEarly: string;
  lensHeldTint: string;
  lensHeldRim: string;
  lensShadow: string;
  pressFill: string;
  pressLift: string;
  // The selected tab's ink under a finger, over a light backdrop and over a dark one.
  tabAccent: string;
  tabAccentOver: string;
  tabActive: string;
  tabActiveOver: string;
  legibilityShadow: string;
  badge: string;
  badgeText: string;
  clearButton: string;
  switchOn: string;
  switchOff: string;
  switchThumb: string;
  sliderTrack: string;
  sliderThumb: string;
  sliderShadow: string;
  segmentedTrack: string;
  segmentedThumb: string;
  segmentedShadow: string;
  buttonFill: string;
  buttonDestructive: string;
  buttonDisabled: string;
}

export type LucentColorOverrides = Partial<Record<LucentScheme, Partial<LucentColors>>>;

export const systemTint: Record<LucentScheme, string> = {
  dark: '#0A84FF',
  light: '#007AFF',
};

type Derived = 'tint' | 'tabAccent' | 'tabAccentOver' | 'tabActive' | 'tabActiveOver' | 'tabInk';

const baseColors: Record<LucentScheme, Omit<LucentColors, Derived>> = {
  dark: {
    text: '#FFFFFF',
    placeholder: 'rgba(255, 255, 255, 0.3)',
    placeholderActive: 'rgba(255, 255, 255, 0.38)',
    barTint: 'rgba(90, 90, 90, 0)',
    barFallback: '#17171A',
    barFallbackPill: '#2A2A2E',
    barFallbackShadow: 'rgba(0, 0, 0, 0.2)',
    // A light hairline keeps the dark bar apart from dark content, close to it in tone.
    barFallbackRim: 'rgba(255, 255, 255, 0.08)',
    barShadow: 'rgba(0, 0, 0, 0.03)',
    // iOS 27's selected pill in dark mode is the bar's frost tone (glass.tone.dark.frost*), with no fill over it.
    lens: 'rgba(0, 0, 0, 0)',
    lensActive: 'rgba(0, 0, 0, 0)',
    lensRim: 'rgba(255, 255, 255, 0.16)',
    lensRimEarly: 'rgba(255, 255, 255, 0.16)',
    lensTint: 'rgba(0, 0, 0, 0)',
    lensTintEarly: 'rgba(255, 255, 255, 0)',
    lensHeldTint: 'rgba(0, 0, 0, 0)',
    // A hairline that dims what's under it, as iOS 27's outline does (about 0.69 of white, nothing over black).
    lensHeldRim: 'rgba(0, 0, 0, 0.3)',
    lensShadow: 'rgba(0, 0, 0, 0)',
    pressFill: 'rgba(255, 255, 255, 0.38)',
    pressLift: 'rgba(255, 255, 255, 0.038)',
    legibilityShadow: 'rgba(0, 0, 0, 0.55)',
    badge: '#FF4245',
    badgeText: '#FFFFFF',
    clearButton: '#FFFFFF',
    switchOn: '#30D158',
    switchOff: 'rgba(235, 235, 240, 0.3)',
    switchThumb: '#FFFFFF',
    sliderTrack: 'rgba(120, 120, 128, 0.36)',
    sliderThumb: '#FFFFFF',
    sliderShadow: 'rgba(0, 0, 0, 0.13)',
    segmentedTrack: 'rgba(118, 118, 128, 0.24)',
    segmentedThumb: '#7B7B81',
    segmentedShadow: 'rgba(0, 0, 0, 0)',
    buttonFill: 'rgba(120, 120, 128, 0.32)',
    buttonDestructive: '#FF4245',
    buttonDisabled: 'rgba(235, 235, 245, 0.22)',
  },
  light: {
    text: '#000000',
    placeholder: 'rgba(60, 60, 67, 0.6)',
    placeholderActive: '#808080',
    barTint: 'rgba(251, 251, 251, 0.53)',
    barFallback: '#FAFAFA',
    barFallbackPill: '#E8E8EC',
    barFallbackShadow: 'rgba(0, 0, 0, 0.1)',
    // A dark hairline keeps the near-white bar apart from white content, which its soft shadow barely does.
    barFallbackRim: 'rgba(0, 0, 0, 0.08)',
    barShadow: 'rgba(0, 0, 0, 0.012)',
    lens: 'rgba(0, 0, 0, 0.07)',
    lensActive: 'rgba(255, 255, 255, 0.28)',
    lensRim: 'rgba(0, 0, 0, 0.16)',
    lensRimEarly: 'rgba(0, 0, 0, 0)',
    lensTint: 'rgba(0, 0, 0, 0)',
    lensTintEarly: 'rgba(255, 255, 255, 0)',
    lensHeldTint: 'rgba(0, 0, 0, 0)',
    lensHeldRim: 'rgba(0, 0, 0, 0.16)',
    lensShadow: 'rgba(0, 0, 0, 0.05)',
    pressFill: 'rgba(255, 255, 255, 1)',
    pressLift: 'rgba(255, 255, 255, 0.25)',
    legibilityShadow: 'rgba(255, 255, 255, 0)',
    badge: '#FF383C',
    badgeText: '#FFFFFF',
    clearButton: '#000000',
    switchOn: '#34C759',
    switchOff: 'rgba(120, 120, 128, 0.44)',
    switchThumb: '#FFFFFF',
    sliderTrack: 'rgba(120, 120, 128, 0.2)',
    sliderThumb: '#FFFFFF',
    sliderShadow: 'rgba(0, 0, 0, 0.07)',
    segmentedTrack: 'rgba(118, 118, 128, 0.12)',
    segmentedThumb: '#FFFFFF',
    segmentedShadow: 'rgba(0, 0, 0, 0.015)',
    buttonFill: 'rgba(120, 120, 128, 0.16)',
    buttonDestructive: '#FF383C',
    buttonDisabled: 'rgba(60, 60, 67, 0.22)',
  },
};

const parseHex = (hex: string): [number, number, number] | null => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) {
    return null;
  }
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const toHex = (channels: number[]) =>
  `#${channels
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

// The selected tab's ink on iOS 27 (simulator, iPhone 18 Pro Max, #FF8433), by what's under the bar: each a scale and
// a lift on every channel of the tint, which keeps it as saturated as it is (a mix toward white would wash it out).
// - Resting, over a light backdrop (a photo, white): dark mode (255, 212, 135), light mode a shade darker (243, 123, 43).
// - Resting, over a dark one (a dark list, black): dark mode (255, 140, 59); light mode over black much darker (187,
//   76, 4).
// - Held under a finger (the lens), over a light backdrop: dark mode (255, 255, 176), light mode the tint itself. The
//   lens dims what it shows by about 5%, so dark mode lifts a little more.
// - Held, over a dark backdrop: dark mode (255, 167, 92); light mode over black (212, 97, 21).
// The bar blends each pair by how light its backdrop reads (`inkTone`, glass.inkLuma).
type Ink = { scale: number; lift: number };
const tintRamp: Record<LucentScheme, { active: Ink; over: Ink; held: Ink; heldOver: Ink }> = {
  dark: {
    active: { scale: 1, lift: 0.337 },
    over: { scale: 1, lift: 0.025 },
    held: { scale: 1, lift: 0.52 },
    heldOver: { scale: 0.914, lift: 0.17 },
  },
  light: {
    active: { scale: 1, lift: -0.035 },
    over: { scale: 0.917, lift: -0.184 },
    held: { scale: 1, lift: 0 },
    heldOver: { scale: 0.935, lift: -0.104 },
  },
};

const ink = (hex: string, { scale, lift }: Ink) => {
  const channels = parseHex(hex);
  return channels ? toHex(channels.map((channel) => channel * scale + 255 * lift)) : hex;
};

// One UI 9's grey for a tab that isn't selected (a community One UI 9 kit's navigation bar).
const solidInk: Record<LucentScheme, string> = { dark: '#8A8A8A', light: '#505055' };
const clear = 'rgba(0, 0, 0, 0)';

/**
 * The theme's colours. Drawn solid, the selected tab is the tint itself, with nothing for a backdrop to shift, and the
 * lens draws no tint or outline of its own: its fill is the bar's pill (barFallbackPill).
 */
export const resolveColors = (
  scheme: LucentScheme,
  tint: string | undefined,
  overrides: LucentColorOverrides | undefined,
  solid = false,
): LucentColors => {
  const accent = tint ?? systemTint[scheme];
  const ramp = tintRamp[scheme];
  const base = baseColors[scheme];
  return {
    ...base,
    tint: accent,
    tabInk: base.text,
    tabAccent: ink(accent, ramp.held),
    tabAccentOver: ink(accent, ramp.heldOver),
    tabActive: ink(accent, ramp.active),
    tabActiveOver: ink(accent, ramp.over),
    ...(solid
      ? {
          tabInk: solidInk[scheme],
          tabAccent: accent,
          tabAccentOver: accent,
          tabActive: accent,
          tabActiveOver: accent,
          lens: clear,
          lensActive: clear,
          lensRim: clear,
          lensRimEarly: clear,
          lensTint: clear,
          lensTintEarly: clear,
          lensHeldTint: clear,
          lensHeldRim: clear,
          lensShadow: clear,
          // Not clear black: Android reads a text shadow of 0 as unset and draws its default dark one.
          legibilityShadow: 'rgba(255, 255, 255, 0)',
        }
      : {}),
    ...overrides?.[scheme],
  };
};
