package expo.modules.lucent

import java.lang.ref.WeakReference

internal object GlassRegistry {
  const val DEFAULT_GROUP = "default"

  private val backdrops = HashMap<String, WeakReference<GlassBackdropView>>()

  fun register(group: String, view: GlassBackdropView) {
    backdrops[group] = WeakReference(view)
  }

  fun unregister(group: String, view: GlassBackdropView) {
    if (backdrops[group]?.get() === view) {
      backdrops.remove(group)
    }
  }

  fun backdrop(group: String): GlassBackdropView? = backdrops[group]?.get()
}
