import { useEffect } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

/**
 * How a search field's clear button comes and goes on iOS 27 (simulator, frame by frame): it fades in about 80ms after
 * the first character, over about 155ms, and out about 20ms after the text's cleared, over about 140ms, eased at both
 * ends. Nothing else in the field moves: the text and placeholder swap at once.
 */
export const clearFade = {
  in: { delay: 80, duration: 155 },
  out: { delay: 20, duration: 140 },
} as const;

/** The clear button's fade, for a field that has text (`shown`) or not. */
export const useClearFade = (shown: boolean) => {
  const opacity = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    const { delay, duration } = shown ? clearFade.in : clearFade.out;
    opacity.set(withDelay(delay, withTiming(shown ? 1 : 0, { duration, easing: Easing.inOut(Easing.quad) })));
  }, [shown, opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.get() }));
};
