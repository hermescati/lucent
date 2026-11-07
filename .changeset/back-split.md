---
'expo-lucent': patch
---

Split the back button off the leading items' capsule when `headerBackVisible` brings it beside them, and melt it back in when it goes, as the tab bar's search circle does: beside `Stack.Toolbar`'s leading items it now shares their glass, so a neck joins the two halfway. Also fix the shared glass drawing a capsule that splits off at its starting size until it settled, since `measure` reads its scale late.
