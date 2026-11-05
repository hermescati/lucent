---
'expo-lucent': patch
---

On Android, the tab bar's labels, badges and icons keep their size at larger font scales, as iOS's do, and its search field's text grows only as far as iOS's does in its 48pt field. Lucent's Material Symbols (tab bar, buttons and menus) no longer clip at larger font scales. TalkBack no longer reaches search's hidden back button and field while search is closed, or the tabs while it's open, and reads a bottom accessory's own controls instead of the whole capsule. The bar lays out correctly in right-to-left languages. The search field's clear button takes a 48dp touch. `expo-font` is now a peer dependency.
