---
'expo-lucent': patch
---

On Android, glass grows under the finger at iOS 26's pace: about 130ms to full size instead of 80, from recordings of iOS's bar buttons and glass buttons, which share the motion. A quick tap now lets go before the glass has fully grown, so it swells less, as on iOS. The release springs back a little more slowly too. This applies to every pressable glass: bar buttons, `Button`, and interactive `GlassView`.
