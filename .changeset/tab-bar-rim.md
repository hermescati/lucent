---
'expo-lucent': patch
---

On Android, glass is drawn more like iOS 27's:

- **Outline:** a thin ring that darkens whatever is behind it, rather than a fixed hairline. It's softer over white, gone over black, and has no top edge in dark mode. The theme colours `barRim` and `glassOutline` are gone.
- **Material:** in the tab bar, the navigation bar, buttons and glass views, it's now mostly a wide haze, with the content behind showing faintly at every scale.
