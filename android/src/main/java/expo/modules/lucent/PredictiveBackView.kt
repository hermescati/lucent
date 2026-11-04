package expo.modules.lucent

import android.content.Context
import androidx.activity.BackEventCompat
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 * Android's back, for a stack that runs its own: the back gesture from the screen's edges, as it goes (Android 14 and
 * later, with predictive back on), and the Back key and the gesture's release otherwise.
 *
 * It takes back from the activity only while enabled, which the stack keeps to while its top screen can go back. Each
 * step goes out as an event on the main thread, where Reanimated runs a worklet handler for it then and there, so the
 * screens move with the finger without a trip through JavaScript.
 */
class PredictiveBackView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onBack by EventDispatcher()
  private val density = resources.displayMetrics.density
  // Whether the back in hand began as a gesture: one that didn't (the Back key, or the gesture without predictive back)
  // only arrives once it's done.
  private var dragging = false

  var takesBack = false
    set(value) {
      field = value
      callback.isEnabled = value && isAttachedToWindow
    }

  private val callback =
    object : OnBackPressedCallback(false) {
      override fun handleOnBackStarted(backEvent: BackEventCompat) {
        dragging = true
        send("start", backEvent)
      }

      override fun handleOnBackProgressed(backEvent: BackEventCompat) {
        if (dragging) send("progress", backEvent)
      }

      override fun handleOnBackCancelled() {
        if (!dragging) return
        dragging = false
        onBack(mapOf("type" to "cancel"))
      }

      override fun handleOnBackPressed() {
        val type = if (dragging) "commit" else "press"
        dragging = false
        onBack(mapOf("type" to type))
      }
    }

  private fun send(type: String, event: BackEventCompat) {
    onBack(
      mapOf(
        "type" to type,
        "x" to event.touchX / density,
        "progress" to event.progress,
        "fromRight" to (event.swipeEdge == BackEventCompat.EDGE_RIGHT),
      ),
    )
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    // Added on attaching, so it comes after the activity's own (React Native's), which hands back to JavaScript: the
    // last enabled callback has back.
    val activity = appContext.currentActivity as? ComponentActivity ?: return
    callback.remove()
    activity.onBackPressedDispatcher.addCallback(callback)
    callback.isEnabled = takesBack
  }

  override fun onDetachedFromWindow() {
    callback.remove()
    dragging = false
    super.onDetachedFromWindow()
  }
}
