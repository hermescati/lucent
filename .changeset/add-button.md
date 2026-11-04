---
'expo-lucent': minor
---

Add `Button`, with the same API as `@expo/ui`'s plus `glass` and `glassProminent` variants, `icon`, `size`, `destructive` and `tintColor`. On iOS it renders SwiftUI's button; on Android, Lucent draws iOS's capsule buttons in each style, with real glass for the glass ones. `useButtonColor()` gives custom `children` the label colour. The theme gains `buttonFill`, `buttonDestructive` and `buttonDisabled`.
