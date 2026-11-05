import type { LucentScheme } from './tokens';

export interface LucentColors {
  tint: string;
  text: string;
  placeholder: string;
  placeholderActive: string;
  barTint: string;
  barFallback: string;
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

const baseColors: Record<LucentScheme, Omit<LucentColors, 'tint' | 'tabAccent' | 'tabAccentOver' | 'tabActive' | 'tabActiveOver'>> = {
  dark: {
    text: '#FFFFFF',
    placeholder: 'rgba(255, 255, 255, 0.3)',
    placeholderActive: 'rgba(255, 255, 255, 0.38)',
    barTint: 'rgba(90, 90, 90, 0)',
    barFallback: '#2F2F32',
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
    barFallback: '#F4F5F9',
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

export const resolveColors = (
  scheme: LucentScheme,
  tint: string | undefined,
  overrides: LucentColorOverrides | undefined,
): LucentColors => {
  const accent = tint ?? systemTint[scheme];
  const ramp = tintRamp[scheme];
  return {
    ...baseColors[scheme],
    tint: accent,
    tabAccent: ink(accent, ramp.held),
    tabAccentOver: ink(accent, ramp.heldOver),
    tabActive: ink(accent, ramp.active),
    tabActiveOver: ink(accent, ramp.over),
    ...overrides?.[scheme],
  };
};
