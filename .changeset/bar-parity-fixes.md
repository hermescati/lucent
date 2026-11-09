---
'expo-lucent': patch
---

Keep the navigation bar's shared glass capsules their resting size once a screen's buttons have popped in, where they could stay a few points too big and run past the bar's margin. Fill a prominent bar button with the system blue unless it has a tint of its own, as UIKit does, and paint an opaque bar iOS 27's grouped grey in light mode.
