import { router } from 'expo-router';

type ScrollToTop = () => void;

let focusedScroll: ScrollToTop | null = null;

export const registerFocusedScroll = (scrollToTop: ScrollToTop) => {
  focusedScroll = scrollToTop;
  return () => {
    if (focusedScroll === scrollToTop) {
      focusedScroll = null;
    }
  };
};

interface ReselectOptions {
  disablePopToTop?: boolean;
  disableScrollToTop?: boolean;
}

export const reselectTab = ({ disablePopToTop, disableScrollToTop }: ReselectOptions) => {
  if (!disablePopToTop && router.canDismiss()) {
    router.dismissAll();
    return;
  }
  if (!disableScrollToTop) {
    focusedScroll?.();
  }
};
