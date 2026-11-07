---
'expo-lucent': patch
---

Back in search mode works as iOS 27's swipe back does: with a screen to go back to, in the stack or one it's nested in, it leaves the screen, search mode and all, rather than only ending search mode. On a first screen, which iOS has no swipe back from, it still ends search mode. Clearing a search field whose keyboard has gone brings the keyboard back, as on iOS.
