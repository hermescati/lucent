import { useEffect, useSyncExternalStore } from 'react';

// Lucent's own overlays that close on back before anything else: an open menu, a focused search field. While one is
// up, a stack leaves back to them rather than taking the gesture itself.
let claims = 0;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const change = (by: number) => {
  claims += by;
  listeners.forEach((listener) => listener());
};

/** Holds back while `active`: the stack's back gesture stands aside. */
export const useBackClaim = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    change(1);
    return () => change(-1);
  }, [active]);
};

/** Whether anything holds back. */
export const useBackClaimed = () => useSyncExternalStore(subscribe, () => claims > 0);
