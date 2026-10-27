import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { resolveColors, type LucentColorOverrides, type LucentColors } from './colors';
import type { LucentScheme } from './tokens';

export interface LucentProviderProps {
  colorScheme?: 'auto' | LucentScheme;
  tintColor?: string;
  colors?: LucentColorOverrides;
  children: ReactNode;
}

interface LucentSettings {
  colorScheme: 'auto' | LucentScheme;
  tintColor?: string;
  colors?: LucentColorOverrides;
}

const LucentContext = createContext<LucentSettings>({ colorScheme: 'auto' });

export const LucentProvider = ({ colorScheme = 'auto', tintColor, colors, children }: LucentProviderProps) => {
  const settings = useMemo(() => ({ colorScheme, tintColor, colors }), [colorScheme, tintColor, colors]);
  return <LucentContext value={settings}>{children}</LucentContext>;
};

export interface LucentTheme {
  scheme: LucentScheme;
  color: LucentColors;
}

export const useLucentTheme = (tintColor?: string): LucentTheme => {
  const settings = useContext(LucentContext);
  const system = useColorScheme();
  const scheme: LucentScheme =
    settings.colorScheme === 'auto' ? (system === 'dark' ? 'dark' : 'light') : settings.colorScheme;
  const tint = tintColor ?? settings.tintColor;
  const color = useMemo(() => resolveColors(scheme, tint, settings.colors), [scheme, tint, settings.colors]);
  return { scheme, color };
};
