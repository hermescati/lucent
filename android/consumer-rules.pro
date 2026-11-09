# Lucent finds react-native-screens' stack and screens by class name (rnscreens isn't a compile-time dependency): its
# lifted glass keeps to what the screens above leave showing, and it slides a pushed screen in itself. Keep the names
# R8 would otherwise shorten in an app's release build.
-keepnames class com.swmansion.rnscreens.Screen
-keepnames class com.swmansion.rnscreens.ScreenStack
-keepnames class com.swmansion.rnscreens.ScreenContainer
