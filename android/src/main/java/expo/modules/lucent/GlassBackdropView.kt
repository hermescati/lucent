package expo.modules.lucent

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.RectF
import android.graphics.RenderNode
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class GlassBackdropView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  internal val node: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassBackdrop") else null
  internal val outNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassBackdropOut") else null

  private val lifted = LinkedHashSet<GlassView>()
  private val order = ArrayList<GlassView>()
  private var orderDirty = false
  private val toGlobal = Matrix()
  private val toHost = Matrix()

  init {
    clipChildren = false
    clipToPadding = false
  }

  var offscreen = false

  var group: String = GlassRegistry.DEFAULT_GROUP
    set(value) {
      if (value == field) return
      GlassRegistry.unregister(field, this)
      field = value
      if (isAttachedToWindow) GlassRegistry.register(value, this)
    }

  private val preDraw = ViewTreeObserver.OnPreDrawListener {
    if (lifted.isNotEmpty()) invalidate()
    true
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    GlassRegistry.register(group, this)
    viewTreeObserver.addOnPreDrawListener(preDraw)
  }

  override fun onDetachedFromWindow() {
    viewTreeObserver.removeOnPreDrawListener(preDraw)
    GlassRegistry.unregister(group, this)
    super.onDetachedFromWindow()
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) = Unit

  @SuppressLint("MissingSuperCall")
  override fun requestLayout() = Unit

  internal fun addLifted(view: GlassView) {
    if (lifted.add(view)) {
      orderDirty = true
      invalidate()
    }
  }

  internal fun removeLifted(view: GlassView) {
    if (lifted.remove(view)) {
      orderDirty = true
      invalidate()
    }
  }

  private fun collect(view: View) {
    if (view is GlassView && view in lifted) order.add(view)
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) collect(view.getChildAt(i))
    }
  }

  private fun sortLifted() {
    if (!orderDirty) return
    order.clear()
    for (i in 0 until childCount) collect(getChildAt(i))
    orderDirty = false
  }

  internal fun drawSource(canvas: Canvas, upTo: GlassView?) {
    val content = node ?: return
    if (!content.hasDisplayList()) return
    canvas.drawRenderNode(content)
    if (upTo == null) return
    for (view in order) {
      if (view === upTo) break
      if (!view.flat || !RectF.intersects(upTo.hostBounds, view.hostBounds)) continue
      view.clipNode?.takeIf { it.hasDisplayList() }?.let { canvas.drawRenderNode(it) }
    }
  }

  internal fun overlapsEarlier(target: GlassView): Boolean {
    for (view in order) {
      if (view === target) return false
      if (RectF.intersects(target.hostBounds, view.hostBounds)) return true
    }
    return false
  }

  internal val visibleNode: RenderNode?
    get() = if (lifted.isEmpty()) node else outNode

  override fun dispatchDraw(canvas: Canvas) {
    val recorder = node
    val composite = outNode
    if (recorder == null || composite == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || !canvas.isHardwareAccelerated) {
      super.dispatchDraw(canvas)
      return
    }
    recorder.setPosition(0, 0, width, height)
    recorder.setClipToBounds(false)
    val recording = recorder.beginRecording(width, height)
    try {
      super.dispatchDraw(recording)
    } finally {
      recorder.endRecording()
    }
    if (lifted.isEmpty()) {
      if (!offscreen) canvas.drawRenderNode(recorder)
      return
    }
    sortLifted()
    toGlobal.reset()
    transformMatrixToGlobal(toGlobal)
    toGlobal.invert(toHost)
    for (view in order) view.recordLifted(this, toHost)
    composite.setPosition(0, 0, width, height)
    composite.setClipToBounds(false)
    val out = composite.beginRecording(width, height)
    try {
      out.drawRenderNode(recorder)
      for (view in order) view.clipNode?.takeIf { it.hasDisplayList() }?.let { out.drawRenderNode(it) }
    } finally {
      composite.endRecording()
    }
    if (!offscreen) canvas.drawRenderNode(composite)
  }
}
