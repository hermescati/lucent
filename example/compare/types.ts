import type { ComponentType } from 'react';

/**
 * A component's comparison screens. Each page renders the same Lucent components on both platforms: on iOS they are
 * Apple's own, so the iOS capture is the reference and the Android one is Lucent's recreation. Keep a page within one
 * phone screen, starting at the top; `npm run compare` captures every page.
 */
/** A page. `fill` makes it fill the screen instead of sitting in the frame's margins, for forms, lists and navigation. */
export type ComparisonPage = ComponentType & { fill?: boolean };

/** Marks a page to fill the screen. */
export const filled = (page: ComponentType): ComparisonPage => Object.assign(page, { fill: true });

export interface Comparison {
  slug: string;
  pages: ComparisonPage[];
  /**
   * An iOS component Lucent doesn't have yet. Its pages render Apple's own through `@expo/ui` and exist only on iOS
   * (`references/*.ios.tsx`); the script captures them alone, as the target for building Lucent's version.
   */
  reference?: boolean;
}
