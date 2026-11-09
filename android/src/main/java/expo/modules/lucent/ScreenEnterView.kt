package expo.modules.lucent

import android.content.Context
import android.view.View
import android.view.ViewTreeObserver
import android.view.animation.AnimationSet
import android.view.animation.TranslateAnimation
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 * Says when a screen Lucent pushes starts coming in, on the main thread, where Reanimated runs a worklet handler for
 * the event then and there: the stack's slide starts in the frame react-native-screens starts its own, without waiting
 * on JavaScript, which is still busy with the new screen.
 *
 * react-native-screens runs its fade from the bottom on the view that holds the screen in its stack. Lucent's slide
 * brings the screen in instead, so that animation is cleared once it has started: started, its end still reaches the
 * screen's fragment, which finishes as it would have.
 */
class ScreenEnterView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onEnter by EventDispatcher()
  private var listening = false
  private var done = false

  var armed = false
    set(value) {
      field = value
      update()
    }

  private val preDraw =
    ViewTreeObserver.OnPreDrawListener {
      check()
      true
    }

  private fun check() {
    val holder = holder() ?: return
    val animation = holder.animation ?: return
    // Drawn once first, so clearing it ends it rather than dropping it.
    if (!animation.hasStarted()) return
    done = true
    update()
    // The fade from the bottom moves the screen up as it fades in; another animation (a replace's) isn't a push.
    if (animation !is AnimationSet || animation.animations.none { it is TranslateAnimation }) return
    holder.clearAnimation()
    // After this frame: the slide changes the stack's views, which isn't for the middle of a draw.
    post { onEnter(mapOf<String, Any>()) }
  }

  // The stack's child this view is in.
  private fun holder(): View? {
    var view: View = this
    while (true) {
      val parent = view.parent as? View ?: return null
      if (parent.javaClass.simpleName == "ScreenStack") return view
      view = parent
    }
  }

  private fun update() {
    val listen = armed && !done && isAttachedToWindow
    if (listen == listening) return
    listening = listen
    if (listen) viewTreeObserver.addOnPreDrawListener(preDraw) else viewTreeObserver.removeOnPreDrawListener(preDraw)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    update()
  }

  override fun onDetachedFromWindow() {
    if (listening) viewTreeObserver.removeOnPreDrawListener(preDraw)
    listening = false
    super.onDetachedFromWindow()
  }
}
