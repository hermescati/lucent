import type { ButtonSize, ButtonVariant } from './types';

// iOS 26's controlSize metrics, measured on the simulator: capsule height, label, side padding, icon-only circle.
export const buttonMetrics: Record<
  ButtonSize,
  { height: number; circle: number; padding: number; fontSize: number; lineHeight: number; icon: number; gap: number }
> = {
  small: { height: 28, circle: 25, padding: 11, fontSize: 15, lineHeight: 20, icon: 18, gap: 9 },
  regular: { height: 34, circle: 31, padding: 14, fontSize: 17, lineHeight: 22, icon: 21, gap: 9 },
  large: { height: 50, circle: 47, padding: 22, fontSize: 17, lineHeight: 22, icon: 21, gap: 9 },
};

/**
 * What a held button looks like, measured from iOS 26's buttons in the simulator. `wash` is a layer over the fill: white
 * in dark mode and black in light mode, at this opacity. `label` is the label's opacity. Glass lifts and glows on its
 * own, so its washes are zero.
 */
export const buttonPressed: Record<
  ButtonVariant,
  { wash: { dark: number; light: number }; label: { dark: number; light: number } }
> = {
  filled: { wash: { dark: 0.2, light: 0.22 }, label: { dark: 0.8, light: 0.8 } },
  outlined: { wash: { dark: 0.05, light: 0.09 }, label: { dark: 1, light: 1 } },
  text: { wash: { dark: 0, light: 0 }, label: { dark: 0.75, light: 0.75 } },
  glass: { wash: { dark: 0, light: 0 }, label: { dark: 1, light: 0.55 } },
  glassProminent: { wash: { dark: 0, light: 0 }, label: { dark: 1, light: 1 } },
};

export const buttonMotion = {
  pressIn: 60,
  pressOut: 220,
} as const;
