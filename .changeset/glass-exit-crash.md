---
'expo-lucent': patch
---

Fix a crash on Android when a screen with glass on it is removed, for example when the navigation tree remounts. The glass on the departing screen could draw a backdrop that still contained it, which overflowed the render thread.
