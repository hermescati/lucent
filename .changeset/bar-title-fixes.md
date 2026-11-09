---
'expo-lucent': patch
---

On Android, a large title on the buttons' row (`headerLargeTitleInline`) cross-fades with the small title where it stands as the page scrolls, as iOS 27's does, rather than the small one rising into the row. The centred title no longer jumps aside for a moment as a button melts into or splits off its capsule: it waits that out before moving for a wider side. In the solid fallback, the large title on the row shows: the bar's cover hid it.
