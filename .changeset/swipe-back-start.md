---
'expo-lucent': patch
---

On Android, the stack's swipe back starts after 10pt of drag rather than 20, about Android's touch slop, so a short or slightly slanted swipe no longer scrolls the page instead; and a quick flick goes back however short it is, as on iOS, where only one past half the screen did.
