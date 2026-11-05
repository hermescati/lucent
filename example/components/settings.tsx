import { LucentProvider, setGlassFallback, type GlassFallback } from 'expo-lucent';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import type { AccessoryKind } from '@/components/accessories';

export type Scheme = 'auto' | 'light' | 'dark';
export type Minimize = 'never' | 'onScrollDown' | 'onScrollUp';

export const accents = [
  { name: 'Orange', color: '#FF8433' },
  { name: 'Blue', color: '#0A84FF' },
  { name: 'Green', color: '#30D158' },
  { name: 'Pink', color: '#FF375F' },
  { name: 'Purple', color: '#BF5AF2' },
] as const;

export type TabCount = 1 | 2 | 3 | 4 | 5;
export type SearchPlacement = 'off' | 'circle' | 'tab';

export interface Settings {
  scheme: Scheme;
  tint: string;
  glassOpacity: number;
  minimize: Minimize;
  // Which bottom accessory the bar shows, if any.
  accessory: AccessoryKind;
  // How many tabs the bar has besides search, and search: none, a circle of its own, or a tab among them.
  tabs: TabCount;
  search: SearchPlacement;
  // Profile set apart in the circle as iOS 27's prominent tab, as an action would be.
  prominent: boolean;
  // Android: draw an older Android's glass (Android 12's blur, or 11's flat fill) to see the fallbacks.
  glassFallback: GlassFallback;
}

const defaults: Settings = {
  scheme: 'auto',
  tint: accents[0].color,
  glassOpacity: 0.5,
  minimize: 'onScrollDown',
  accessory: 'none',
  tabs: 3,
  search: 'circle',
  prominent: false,
  glassFallback: 'auto',
};

interface SettingsContext extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const Context = createContext<SettingsContext>({ ...defaults, set: () => {}, reset: () => {} });

export const PlaygroundProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState(defaults);
  const system = useColorScheme();
  const dark = (settings.scheme === 'auto' ? system : settings.scheme) === 'dark';

  useEffect(() => {
    Appearance.setColorScheme(settings.scheme === 'auto' ? 'unspecified' : settings.scheme);
  }, [settings.scheme]);

  useEffect(() => {
    setGlassFallback(settings.glassFallback);
  }, [settings.glassFallback]);

  const value = useMemo(
    () => ({
      ...settings,
      set: (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch })),
      reset: () => setSettings(defaults),
    }),
    [settings],
  );

  return (
    <Context value={value}>
      {/* React Navigation's theme, as the README's quick start sets it: headers and screen backgrounds read it. */}
      <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
        <LucentProvider colorScheme={settings.scheme} tintColor={settings.tint} glassOpacity={settings.glassOpacity}>
          {children}
        </LucentProvider>
      </ThemeProvider>
    </Context>
  );
};

export const useSettings = () => use(Context);
