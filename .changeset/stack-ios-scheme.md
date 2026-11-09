---
'expo-lucent': patch
---

On iOS, `Stack`'s navigation bar takes `LucentProvider`'s colour scheme, as it does on Android. Before, it followed React Navigation's theme alone, which is light when an app sets none, so a dark app showed a light bar: light glass buttons and a black title. A `headerUserInterfaceStyle` in the app's screen options still wins. On Android, `Stack` sets the status bar's icons from the same scheme, dark on a light screen, so they no longer stay white when the scheme changes while the app runs. A `statusBarStyle` in the screen options still wins.
