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

/** A second tap on the focused tab: back to the first screen of its stack, or, there already, the top of its content. */
export const reselectTab = ({ disablePopToTop, disableScrollToTop }: ReselectOptions, canPop: boolean) => {
  if (!disablePopToTop && canPop) {
    router.dismissAll();
    return;
  }
  if (!disableScrollToTop) {
    focusedScroll?.();
  }
};
