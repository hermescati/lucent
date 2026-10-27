import type { LucentScheme } from './tokens';

export interface LucentColors {
  tint: string;
  text: string;
  placeholder: string;
  barTint: string;
  barFallback: string;
  barShadow: string;
  barRim: string;
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
  tabAccent: string;
  tabActive: string;
  tabActiveOver: string;
  legibilityShadow: string;
  badge: string;
  badgeText: string;
  clearButton: string;
  clearGlyph: string;
}

export type LucentColorOverrides = Partial<Record<LucentScheme, Partial<LucentColors>>>;

export const systemTint: Record<LucentScheme, string> = {
  dark: '#0A84FF',
  light: '#007AFF',
};

const baseColors: Record<LucentScheme, Omit<LucentColors, 'tint' | 'tabAccent' | 'tabActive' | 'tabActiveOver'>> = {
  dark: {
    text: '#FFFFFF',
    placeholder: 'rgba(235, 235, 245, 0.3)',
    barTint: 'rgba(90, 90, 90, 0)',
    barFallback: '#2F2F32',
    barShadow: 'rgba(0, 0, 0, 0.12)',
    barRim: 'rgba(255, 255, 255, 0)',
    lens: 'rgba(0, 0, 0, 0)',
    lensActive: 'rgba(0, 0, 0, 0)',
    lensRim: 'rgba(255, 255, 255, 0.16)',
    lensRimEarly: 'rgba(255, 255, 255, 0.16)',
    lensTint: 'rgba(0, 0, 0, 0)',
    lensTintEarly: 'rgba(255, 255, 255, 0)',
    lensHeldTint: 'rgba(0, 0, 0, 0)',
    lensHeldRim: 'rgba(26, 27, 27, 0.9)',
    lensShadow: 'rgba(0, 0, 0, 0)',
    pressFill: 'rgba(255, 255, 255, 0.38)',
    pressLift: 'rgba(255, 255, 255, 0.038)',
    legibilityShadow: 'rgba(0, 0, 0, 0.55)',
    badge: '#FF4245',
    badgeText: '#FFFFFF',
    clearButton: '#FFFFFF',
    clearGlyph: '#202020',
  },
  light: {
    text: '#000000',
    placeholder: 'rgba(60, 60, 67, 0.3)',
    barTint: 'rgba(245, 245, 245, 0.52)',
    barFallback: '#F4F5F9',
    barShadow: 'rgba(0, 0, 0, 0.012)',
    barRim: 'rgba(0, 0, 0, 0.12)',
    lens: 'rgba(0, 0, 0, 0.07)',
    lensActive: 'rgba(255, 255, 255, 0.28)',
    lensRim: 'rgba(0, 0, 0, 0.16)',
    lensRimEarly: 'rgba(0, 0, 0, 0.06)',
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
    clearGlyph: '#FDFDFD',
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

const mix = (hex: string, target: number, amount: number) => {
  const channels = parseHex(hex);
  return channels ? toHex(channels.map((channel) => channel + (target - channel) * amount)) : hex;
};

const tintRamp: Record<LucentScheme, { accent: number; active: number; over: number }> = {
  dark: { accent: 0.15, active: 0.55, over: 0.05 },
  light: { accent: 0, active: -0.15, over: -0.25 },
};

const shade = (hex: string, amount: number) => (amount >= 0 ? mix(hex, 255, amount) : mix(hex, 0, -amount));

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
    tabAccent: shade(accent, ramp.accent),
    tabActive: shade(accent, ramp.active),
    tabActiveOver: shade(accent, ramp.over),
    ...overrides?.[scheme],
  };
};
