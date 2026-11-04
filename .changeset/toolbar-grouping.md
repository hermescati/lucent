---
'expo-lucent': patch
---

On Android, `Stack.Toolbar` groups its buttons onto glass capsules as iOS 26 does. A text button, or a `Stack.Toolbar.Menu` with only a `title`, gets a capsule of its own instead of sharing its neighbours'. In the navigation bar, a `Stack.Toolbar.Spacer` no longer splits capsules or adds room, since iOS ignores it there; in the bottom toolbar a fixed spacer adds its width to the usual gap between capsules, as on iOS, rather than to two of them. A `Stack.Toolbar.Menu` without a label now shows its `title` on its button, as on iOS, instead of an empty capsule.
