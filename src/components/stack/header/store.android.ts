import type { NativeStackHeaderProps } from 'expo-router/native-stack';
import { useSyncExternalStore } from 'react';

/**
 * native-stack renders a screen's header before its content, and Android's glass draws in that order, so content glass
 * would land on top of the bar. The header native-stack renders is a spacer that leaves its props here; the bar itself
 * renders after the content, through `screenLayout`, and reads them back.
 */
const headers = new Map<string, NativeStackHeaderProps>();
const listeners = new Set<() => void>();

const shallowEqual = (a: object, b: object) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key])
  );
};

// native-stack hands the header a new `options` object on every render, even when nothing in it changed. Telling the
// bar each time re-renders it, and anything it renders that sets options (a toolbar) re-renders the header again: a
// loop. So the bar hears only of a header that differs.
const sameHeader = (a: NativeStackHeaderProps, b: NativeStackHeaderProps) => {
  const { options: aOptions, ...aRest } = a;
  const { options: bOptions, ...bRest } = b;
  return shallowEqual(aRest, bRest) && shallowEqual(aOptions, bOptions);
};

export const setHeader = (routeKey: string, props: NativeStackHeaderProps | undefined) => {
  const current = headers.get(routeKey);
  if (props) {
    if (current && sameHeader(current, props)) return;
    headers.set(routeKey, props);
  } else {
    if (!current) return;
    headers.delete(routeKey);
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** A screen's header props, read once: for a screen further down the stack, which isn't re-rendering. */
export const getHeader = (routeKey: string) => headers.get(routeKey);

export const useHeader = (routeKey: string) => useSyncExternalStore(subscribe, () => headers.get(routeKey));
