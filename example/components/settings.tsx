import { LucentProvider } from 'expo-lucent';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

export type Scheme = 'auto' | 'light' | 'dark';
export type Minimize = 'never' | 'onScrollDown' | 'onScrollUp';
export type Badge = 'none' | 'dot' | 'count';

export const accents = [
  { name: 'Orange', color: '#FF8433' },
  { name: 'Blue', color: '#0A84FF' },
  { name: 'Green', color: '#30D158' },
  { name: 'Pink', color: '#FF375F' },
  { name: 'Purple', color: '#BF5AF2' },
] as const;

export interface Settings {
  scheme: Scheme;
  tint: string;
  glassOpacity: number;
  minimize: Minimize;
  badge: Badge;
}

const defaults: Settings = {
  scheme: 'auto',
  tint: accents[0].color,
  glassOpacity: 0.5,
  minimize: 'onScrollDown',
  badge: 'count',
};

interface SettingsContext extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const Context = createContext<SettingsContext>({ ...defaults, set: () => {}, reset: () => {} });

export const PlaygroundProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState(defaults);

  useEffect(() => {
    Appearance.setColorScheme(settings.scheme === 'auto' ? 'unspecified' : settings.scheme);
  }, [settings.scheme]);

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
      <LucentProvider colorScheme={settings.scheme} tintColor={settings.tint} glassOpacity={settings.glassOpacity}>
        {children}
      </LucentProvider>
    </Context>
  );
};

export const useSettings = () => use(Context);
