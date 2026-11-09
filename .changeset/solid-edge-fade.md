---
'expo-lucent': patch
---

On Android, the navigation bar's solid fallback no longer ends in a hard line: it's the page's colour down to the bottom of its row, then fades to clear over 48pt, to where iOS's soft edge wash is gone, so what scrolls under it dissolves into the bar. Without a title it fades where iOS's wash eases off. It has no hairline. Glass views take a `fallbackFade` for it.
