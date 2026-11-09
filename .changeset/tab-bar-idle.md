---
'expo-lucent': patch
---

On Android, the tab bar stops drawing at rest: its lens wrote a new object for its size every frame, which counts as a change, so the screen behind it redrew 60 times a second with nothing moving.
