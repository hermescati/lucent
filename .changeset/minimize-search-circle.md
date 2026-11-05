---
'expo-lucent': patch
---

On Android, a tab bar with search among its tabs pulls search out into its own circle as it minimizes, as iOS 27's does: the bar takes its narrower width at once and the circle pinches off its end in about 80ms, before the bar gathers. Search melts back in as it expands, and search under More stays there. The bar also no longer expands when its tabs only shift in it, only when another tab is chosen.
