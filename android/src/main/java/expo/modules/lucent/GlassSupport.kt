package expo.modules.lucent

import java.util.WeakHashMap

/**
 * Which glass this device draws: the liquid glass shader (Android 13, RuntimeShader), or solid, as every device without
 * it draws. An override draws solid on a newer phone, so it can show what the fallback looks like.
 */
internal object GlassSupport {
  /** A view whose drawing depends on the level, told when it changes. */
  interface Listener {
    fun glassSupportChanged()
  }

  /** 0: this device's own glass; 1: solid. */
  var fallback = 0
    private set

  /** Whether glass refracts: the shader, unless the override draws solid. */
  val refracts: Boolean
    get() = fallback == 0

  private val listeners = WeakHashMap<Listener, Unit>()

  fun track(listener: Listener) {
    listeners[listener] = Unit
  }

  /** On the main thread: every live glass view redraws at the new level. */
  fun setFallback(level: Int) {
    val next = level.coerceIn(0, 1)
    if (next == fallback) return
    fallback = next
    listeners.keys.toList().forEach { it.glassSupportChanged() }
  }
}
