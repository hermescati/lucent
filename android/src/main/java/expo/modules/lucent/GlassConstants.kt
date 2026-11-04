package expo.modules.lucent

import android.graphics.Color

internal val TRANSPARENT: Color = Color.valueOf(0f, 0f, 0f, 0f)
internal const val HIGH_TEXT_CONTRAST = "high_text_contrast_enabled"
internal const val DEFAULT_LIGHT_ANGLE = 30f
internal const val DEFAULT_HIGHLIGHT_WIDTH = 2f
internal const val SHAPE_STEPS = 4f
internal const val OPEN_CLIP = 100000f
internal const val REFERENCE_SIDE = 110f
internal const val BEZEL_RATIO = 0.5f
internal const val REFRACTION_RATIO = 1.2f
internal const val WIDE_SIGMA_RATIO = 0.6f
internal const val HIGHLIGHT_RATIO = 0.05f
internal const val MIN_BAND = 2f
internal const val GLOW_REACH = 2.5f
internal const val EDGE_SHARP_STRENGTH = 1.2f
internal const val EDGE_SOFT_STRENGTH = 0.6f
internal val EDGE_STOPS = floatArrayOf(0f, 0.3f, 0.7f, 1f)
internal const val ADAPTIVE_LIFT = 0.14f
internal const val ADAPTIVE_DARKEN = 0.22f
internal const val STATE_SIZE = 3 + MAX_SHAPES * 4 + 62 + 68
internal const val SAMPLE_SIZE = 8
internal const val CONTINUOUS_STEPS = 128
internal const val SAMPLE_INTERVAL_MS = 16L
internal const val SAMPLE_INSET = 6f
internal const val SAMPLE_WIDTH = 8f
internal const val SAMPLE_STEP = 0.015f
internal const val TINT_STRENGTH = 0.85f
// The press spring, fitted to recordings of iOS 26's bar and glass buttons, which share it: about 130ms to full size,
// overshooting a little, so a quick tap lets go halfway; then a bouncier release that dips below the rest size.
internal const val PRESS_IN_OMEGA = 24.2f
internal const val PRESS_IN_DAMPING = 0.75f
internal const val PRESS_OUT_OMEGA = 15.4f
internal const val PRESS_OUT_DAMPING = 0.36f
internal const val GLOW_RISE = 0.025f
internal const val GLOW_FALL = 0.12f
internal const val GLOW_DIM = 0.15f
internal const val GLOW_OUTSIDE = 0.6f
internal const val OUTSIDE_REACH = 28f
internal const val LIGHT_FOLLOW = 0.35f
internal const val PRESS_LEAN = 1.5f
internal const val PRESS_STRETCH = 0.01f
internal const val FOLLOW_TIME = 0.05f
internal const val MAX_STEP = 0.05f
internal const val IDLE_GAP = 0.1f
internal const val FRAME_STEP = 1f / 60f
internal const val SUB_STEP = 0.004f
// react-native-screens' screen containers, whose later children (whole screens) draw over the earlier. Only these: the
// views inside a screen are its own, and its header's sits over its content without covering anything.
internal const val SCREEN_VIEW = "com.swmansion.rnscreens.Screen"
internal val SCREEN_CONTAINERS = setOf("com.swmansion.rnscreens.ScreenStack", "com.swmansion.rnscreens.ScreenContainer")
