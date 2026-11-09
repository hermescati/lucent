---
'expo-lucent': patch
---

Cross-fade the navigation bar's titles with iOS 27's timing: the inline title comes in eased out as the large title collapses, a third of the way in by 33ms, where it started slowly, and scrolled back it goes slowly at first, eased in and out over 400ms, where it dropped at once.
