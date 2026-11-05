package expo.modules.lucent

import android.os.Build
import java.util.WeakHashMap

/**
 * Which glass this device draws, with an override that draws an older Android's on this one, so a newer phone can
 * show what the fallbacks look like: the refraction shader needs Android 13 (RuntimeShader), blur Android 12.
 */
internal object GlassSupport {
  /** A view whose drawing depends on the level, told when it changes. */
  interface Listener {
    fun glassSupportChanged()
  }

  /** 0: this device's own glass; 1: as Android 12 (blur, no refraction); 2: as Android 11 and below (no blur). */
  var fallback = 0
    private set

  /** Whether glass refracts: the shader, unless an override draws an older Android's. */
  val refracts: Boolean
    get() = fallback == 0

  /** Whether glass blurs what's behind it. */
  val blurs: Boolean
    get() = fallback < 2 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

  private val listeners = WeakHashMap<Listener, Unit>()

  fun track(listener: Listener) {
    listeners[listener] = Unit
  }

  /** On the main thread: every live glass view redraws at the new level. */
  fun setFallback(level: Int) {
    val next = level.coerceIn(0, 2)
    if (next == fallback) return
    fallback = next
    listeners.keys.toList().forEach { it.glassSupportChanged() }
  }
}
