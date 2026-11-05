---
'expo-lucent': patch
---

Draw the solid fallback's shadow on Android 7 and 8 too, where a shape's shadow layer draws nothing with hardware acceleration: there it's blurred in software into a small bitmap, redrawn only when the shape changes.
