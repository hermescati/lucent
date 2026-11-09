---
'expo-lucent': patch
---

On Android, in release builds, glass on the screen underneath no longer draws over the screen above it as it slides in or swipes away: R8 renamed react-native-screens' screen classes, which Lucent finds by name, and the library now keeps their names. A screen in tabs, which stops short of the window, now covers the bar of the one below it too.
