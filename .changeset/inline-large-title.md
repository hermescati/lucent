---
'expo-lucent': minor
---

`Stack` screens take `headerLargeTitleInline`: with `headerLargeTitle`, the large title sits on the bar's row beside its buttons, as in Photos › Collections, rather than under them. On iOS it's UIKit's `largeTitleDisplayMode = .inline` (iOS 17 and later), which expo-router can't ask for; Lucent sets it on the screen's navigation item. On Android Lucent draws it, from the simulator: 34pt bold, centred on the buttons, the bar an inline one's height, cross-fading to the inline title once content scrolls under the bar. As in UIKit, only a screen without a back button takes it; one with keeps the large title under the row.
