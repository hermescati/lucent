import { requireNativeModule } from 'expo';
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

const native = requireNativeModule<{ isLowRamDevice(): boolean }>('Lucent');

const refractionApi = 33;
// What the native glass checks too (GlassEffect.usesShader): Android 13's shaders, enough memory, and no high-contrast
// text, which asks for solid surfaces.
const refracts = typeof Platform.Version === 'number' && Platform.Version >= refractionApi && !native.isLowRamDevice();
let forced = false;
let highContrast = false;
let solid = !refracts;

const listeners = new Set<() => void>();
const update = () => {
  const next = !refracts || forced || highContrast;
  if (next === solid) return;
  solid = next;
  listeners.forEach((listener) => listener());
};

AccessibilityInfo.isHighTextContrastEnabled?.()
  .then((enabled) => {
    highContrast = enabled;
    update();
  })
  .catch(() => {});
AccessibilityInfo.addEventListener('highTextContrastChanged', (enabled) => {
  highContrast = enabled;
  update();
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Whether glass draws solid here: below Android 13, on a low-memory phone, with high-contrast text, or when forced. */
export const isSolidGlass = () => solid;

/** isSolidGlass, re-rendering as it changes. */
export const useSolidGlass = () => useSyncExternalStore(subscribe, isSolidGlass);

/** setGlassFallback's side here: the components' colours follow. */
export const forceSolidGlass = (next: boolean) => {
  forced = next;
  update();
};
