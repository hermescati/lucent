---
'expo-lucent': patch
---

On Android, the bottom toolbar matches iOS 27's in more cases (simulator, side by side):

- Inside `NativeTabs`, a prominent button and a selected button's fill take the tab bar's tint, as iOS's toolbar does, where they were always the system blue. The navigation bar's keep the system blue, as iOS's do.
- Without a flexible spacer, the toolbar's capsules sit together in its middle, where they were packed to the left.
- `Stack.Toolbar.Spacer` with `sharesBackground` keeps the buttons either side of it on one capsule, its width added between them, where it always split them apart.
- `Stack.Toolbar`'s `backgroundColor` fills its capsules in the solid fallback. Liquid glass ignores it, as iOS has no background colour for it.
