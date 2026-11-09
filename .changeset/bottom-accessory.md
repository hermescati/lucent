---
'expo-lucent': patch
---

On Android, `NativeTabs.BottomAccessory` is drawn as on iOS 26 and 27: a glass capsule across the bar just above it that, as the bar minimizes, drops into the bar's row between its circles, rendering its content once per placement for `NativeTabs.BottomAccessory.usePlacement()`. Minimizing now moves as iOS 27's does, the bar and accessory first shrinking a little together before the bar gathers into its circle. With an accessory the bar fills its room, and with three tabs or more beside search's circle (or a prominent tab's) it fills up to the circle, as on iOS.
