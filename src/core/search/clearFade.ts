import { useEffect } from 'react';
import { useTapGesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * How a search field's clear button comes and goes on iOS 27 (simulator, frame by frame): it fades in about 80ms after
 * the first character, over about 155ms, and out about 20ms after the text's cleared, over about 140ms, eased at both
 * ends. Nothing else in the field moves: the text and placeholder swap at once.
 *
 * Under the finger it dims to about a fifth within a frame or two (at once here) and stays there; let go, it fades out
 * from there with the text, never coming back first.
 */
export const clearFade = {
  in: { delay: 80, duration: 155 },
  out: { delay: 20, duration: 140 },
  // Black to about 200 over a 246 field.
  pressed: 0.2,
} as const;

interface Options {
  // Clears the field, on the JS thread.
  onClear: () => void;
  // Run on the UI thread as the button's touched and let go, for the field's swell.
  onPressIn?: () => void;
  onPressOut?: () => void;
  hitSlop: number;
}

/**
 * A field's clear button, for a field that has text (`shown`) or not: its fade, and the tap that clears it.
 *
 * The fade is a CSS transition on React's `shown`, so it starts as the text clears. The dim is on its own view
 * (`dimStyle`), driven on the UI thread so it starts with the touch, and still by the time the text clears. Like any
 * animation, the fade stalls while React commits, so the search bar keeps what renders on each keystroke small.
 */
export const useClearButton = (shown: boolean, { onClear, onPressIn, onPressOut, hitSlop }: Options) => {
  const dim = useSharedValue(1);

  useEffect(() => {
    if (shown) dim.set(1);
  }, [shown, dim]);

  const gesture = useTapGesture({
    // However long it's held, as a press.
    maxDuration: 60 * 60 * 1000,
    hitSlop,
    onBegin: () => {
      dim.set(clearFade.pressed);
      onPressIn?.();
    },
    onDeactivate: (event) => {
      if (!event.canceled) scheduleOnRN(onClear);
    },
    onFinalize: (event) => {
      onPressOut?.();
      if (event.canceled) dim.set(1);
    },
  });

  const { delay, duration } = shown ? clearFade.in : clearFade.out;
  const fadeStyle = {
    opacity: shown ? 1 : 0,
    transitionProperty: 'opacity',
    transitionDuration: duration,
    transitionDelay: delay,
    transitionTimingFunction: 'ease-in-out',
  } as const;
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.get() }));
  return { fadeStyle, dimStyle, gesture, onClear };
};
