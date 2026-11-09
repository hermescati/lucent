---
'expo-lucent': patch
---

On Android, a pushed screen always slides in. Its push starts on the screen's first native frame, and now and then the swipe hadn't heard of the screen yet: the push gave up and showed it in place, a blank frame and then the whole page. It now waits for the screen, held out of sight, for up to half a second.
