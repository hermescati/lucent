---
'expo-lucent': patch
---

On Android, a screen sliding in or swiped back keeps its rounded corners under a scrolled navigation bar, where the bar's edge (and its solid cover in the solid fallback) stayed square past them. Lifted glass now keeps to a rounded ancestor's corners. The screen a swipe uncovers dims its bar's edge with the rest of it, as iOS does, where the solid cover stayed bright.
