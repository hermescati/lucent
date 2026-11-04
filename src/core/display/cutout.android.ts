import { requireNativeModule } from 'expo';

const native = requireNativeModule<{ topCutoutBottom(): number }>('Lucent');

let cached: number | undefined;

/**
 * How far down the screen a camera cutout in the top's middle reaches, in dp, or 0 without one: a punch hole or notch
 * that a bar at the top has to clear. Read again until the window is attached and reports one.
 */
export const topCutoutBottom = () => {
  if (cached === undefined || cached === 0) cached = native.topCutoutBottom();
  return cached;
};
