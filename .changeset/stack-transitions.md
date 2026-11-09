---
'expo-lucent': minor
---

On Android, the stack pushes and pops with the swipe back's motion, iOS 26's: a pushed screen slides in from the right over the one it covers, which slides partway left and dims, with the rounded corners, shadow and bar buttons of the swipe, on iOS's push spring (fitted to recordings). The back button, the Back key and Android's back gesture pop the screen the same way in reverse. With predictive back on (`android.predictiveBackGestureEnabled`, Android 14 and later), the back gesture from either edge drives the slide as you drag, on the UI thread, and goes or stays as Android decides. Screens with an `animation` of their own keep react-native-screens' animation.
