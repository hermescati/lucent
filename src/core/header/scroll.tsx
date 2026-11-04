import type { ReactElement } from 'react';
import type { SharedValue } from 'react-native-reanimated';

/** On iOS UIKit follows the scroll view itself, snaps it and insets it for the bar. The ref is for Android. */
export const useHeaderScroll = (_scrollRef?: unknown) => undefined;

export const useHeaderInset = (): number => 0;

export const useToolbarInset = (): number => 0;

export const useHeaderStart = (): number => 0;

export const useSearchLift = (): SharedValue<number> | undefined => undefined;

export const HeaderScrollProvider = ({
  children,
}: {
  children: ReactElement;
  routeKey: string;
  transparent: boolean;
  toolbar?: number;
  snap?: number;
}) => children;
