---
'expo-lucent': patch
---

On Android, a search field that stays under the navigation bar's row (`hideWhenScrolling: false`) is part of the bar's scroll edge, as on iOS 27: the edge reaches down to the field's bottom and is the soft one unless the screen sets `scrollEdgeEffects`, with no line, so what scrolls behind the row stays readable through a light blur. Focused, as the field rises into the row, the edge comes back up with it.

As the stack pushes or swipes back, such a field holds still while the pages slide and fades with the swipe, as iOS 27's does: it's the bar's, not the page's. A field under a large title still slides with its page.
