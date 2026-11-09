---
'expo-lucent': patch
---

On Android, glass stops drawing when nothing under or around it moves: it redrew every frame, which kept the app rendering at the full refresh rate on a still screen. The tab bar's lens also comes fully to rest after a tab switch instead of nudging its shape by fractions of a pixel forever.
