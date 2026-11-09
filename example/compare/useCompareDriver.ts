import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** The port `npm run compare` serves its current page on. Android reaches it through `adb reverse`. */
const driver = 'http://localhost:8099';
const pollMs = 500;
// Long enough for a presented view's dismissal to finish before the next page.
const dismissMs = 600;

// What the current page has presented (an alert, a sheet, a popover), to close before leaving it.
const dismissers = new Set<() => void>();
// Whether a comparison page is up, so the next one replaces it: a fresh screen, with no options left over from the last.
let onComparison = false;

/**
 * Lets `npm run compare` drive the app: in development, polls the script for the page to show and opens it. The page
 * reports back through `useCompareShown` once it has rendered, so the script captures only after both apps are there.
 * Deep links can't do this, because Android's dev launcher keeps them from the running app. Without the script running,
 * every request fails quietly.
 */
export const useCompareDriver = () => {
  useEffect(() => {
    if (!__DEV__) return;
    let shown: string | undefined;
    const id = setInterval(async () => {
      try {
        const { href, key } = (await (await fetch(`${driver}/page`)).json()) as { href: string; key: string };
        if (key && key !== shown) {
          shown = key;
          // A popover outlives its page otherwise, and would cover the next capture.
          if (dismissers.size) {
            dismissers.forEach((dismiss) => dismiss());
            await new Promise((resolve) => setTimeout(resolve, dismissMs));
          }
          // Anchored, so the page opens over compare/index and a navigation bar has a back button.
          const page = `${href}&key=${encodeURIComponent(key)}` as never;
          if (onComparison) router.replace(page, { withAnchor: true });
          else router.navigate(page, { withAnchor: true });
          onComparison = true;
        }
      } catch {
        // The script isn't running.
      }
    }, pollMs);
    return () => clearInterval(id);
  }, []);
};

/**
 * Tells the script a page is on screen: two frames after it renders, so the first one has been drawn. A page that fills
 * the screen also sends where its safe area starts, which differs by phone, so the script lines both captures up there.
 */
export const useCompareShown = (key: string | undefined, fill: boolean) => {
  const { top } = useSafeAreaInsets();
  useEffect(() => {
    if (!__DEV__ || !key) return;
    const params = `os=${Platform.OS}&key=${encodeURIComponent(key)}${fill ? `&top=${top}` : ''}`;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        fetch(`${driver}/shown?${params}`).catch(() => {});
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [key, fill, top]);
};

/** `isPresented` for a page that shows a presentation: open while the page is up, closed before the driver leaves it. */
export const usePresentedForCapture = () => {
  const [presented, setPresented] = useState(true);
  useEffect(() => {
    const dismiss = () => setPresented(false);
    dismissers.add(dismiss);
    return () => {
      dismissers.delete(dismiss);
    };
  }, []);
  return [presented, setPresented] as const;
};
