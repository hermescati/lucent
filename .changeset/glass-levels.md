---
'expo-lucent': patch
---

On Android, `glassOpacity` now matches iOS 27's Liquid Glass setting at both ends: `0` looks like iOS's Clear (light glass lets some of the backdrop back through; dark glass is unchanged, as on iOS) and `1` like Tinted (light glass leans toward white, dark toward black). The tab bar's selected pill in light mode now darkens over dark content as iOS's does.
