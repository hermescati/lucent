import { type ReactNode, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { type LucentColorOverrides, type LucentColors, resolveColors } from './colors';
import { createLucentContext } from './context';
import { useSolidGlass } from './solid';
import { glassOpacity as glassOpacityRange, type LucentScheme } from './tokens';

export interface LucentProviderProps {
  colorScheme?: 'auto' | LucentScheme;
  tintColor?: string;
  colors?: LucentColorOverrides;
  glassOpacity?: number;
  children: ReactNode;
}

interface LucentSettings {
  colorScheme: 'auto' | LucentScheme;
  tintColor?: string;
  colors?: LucentColorOverrides;
  glassOpacity: number;
}

const LucentContext = createLucentContext<LucentSettings>('Lucent', {
  colorScheme: 'auto',
  glassOpacity: glassOpacityRange.default,
});

export const LucentProvider = ({
  colorScheme = 'auto',
  tintColor,
  colors,
  glassOpacity = glassOpacityRange.default,
  children,
}: LucentProviderProps) => {
  const settings = useMemo(
    () => ({ colorScheme, tintColor, colors, glassOpacity }),
    [colorScheme, tintColor, colors, glassOpacity],
  );
  return <LucentContext value={settings}>{children}</LucentContext>;
};

export interface LucentTheme {
  scheme: LucentScheme;
  color: LucentColors;
  glassOpacity: number;
  // Glass drawn solid: below Android 13, with high-contrast text, or setGlassFallback('solid').
  solid: boolean;
}

export const useLucentTheme = (tintColor?: string, colorScheme?: 'auto' | LucentScheme): LucentTheme => {
  const settings = useContext(LucentContext);
  const system = useColorScheme();
  const requested = colorScheme && colorScheme !== 'auto' ? colorScheme : settings.colorScheme;
  const scheme: LucentScheme = requested === 'auto' ? (system === 'dark' ? 'dark' : 'light') : requested;
  const tint = tintColor ?? settings.tintColor;
  const solid = useSolidGlass();
  const color = useMemo(
    () => resolveColors(scheme, tint, settings.colors, solid),
    [scheme, tint, settings.colors, solid],
  );

  return {
    scheme,
    color,
    glassOpacity: settings.glassOpacity,
    solid,
  };
};
