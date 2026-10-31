package expo.modules.lucent

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.RenderEffect
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

  private val lifted = LinkedHashSet<GlassBackdrops>()
  private val order = ArrayList<GlassBackdrops>()
  private var orderDirty = false
  private val toGlobal = Matrix()
  private val toHost = Matrix()

  init {
    clipChildren = false
    clipToPadding = false
  }

  var offscreen = false

  var saturation = 1f
    set(value) {
      if (value == field) return
      field = value
      toneDirty = true
      invalidate()
    }

  var brightness = 1f
    set(value) {
      if (value == field) return
      field = value
      toneDirty = true
      invalidate()
    }

  private var toneDirty = true
  private var toneEffect: RenderEffect? = null
  private val toneMatrix = ColorMatrix()
  private val toneScale = ColorMatrix()
  private val toneLayer: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassTone") else null
  private var toneCount = -1

  private val toned: Boolean
    get() = saturation != 1f || brightness != 1f

  private fun refreshTone() {
    if (!toneDirty) return
    toneDirty = false
    if (!toned) {
      toneEffect = null
      return
    }
    toneMatrix.setSaturation(saturation)
    toneScale.setScale(brightness, brightness, brightness, 1f)
    toneMatrix.postConcat(toneScale)
    toneEffect = RenderEffect.createColorFilterEffect(ColorMatrixColorFilter(toneMatrix))
  }

  private fun recordTone(recorder: RenderNode, upTo: Int) {
    val layer = toneLayer ?: return
    layer.setPosition(0, 0, width, height)
    layer.setClipToBounds(false)
    val out = layer.beginRecording(width, height)
    try {
      out.drawRenderNode(recorder)
      for (i in 0 until upTo) {
        val view = order[i]
        if (view.aboveTone) continue
        view.clipNode?.takeIf { it.hasDisplayList() }?.let { out.drawRenderNode(it) }
      }
    } finally {
      layer.endRecording()
    }
    layer.setRenderEffect(toneEffect)
    toneCount = upTo
  }

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

  internal fun addLifted(view: GlassBackdrops) {
    if (lifted.add(view)) {
      orderDirty = true
      invalidate()
    }
  }

  internal fun removeLifted(view: GlassBackdrops) {
    if (lifted.remove(view)) {
      orderDirty = true
      invalidate()
    }
  }

  private fun collect(view: View) {
    if (view is GlassBackdrops && view in lifted) order.add(view)
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

  internal fun drawSource(canvas: Canvas, upTo: GlassBackdrops?) {
    val content = node ?: return
    if (!content.hasDisplayList()) return
    val layer = toneLayer
    if (upTo != null && upTo.aboveTone && toneCount >= 0 && layer != null) {
      canvas.drawRenderNode(layer)
      for (i in toneCount until order.size) {
        val view = order[i]
        if (view === upTo) break
        if (!RectF.intersects(upTo.hostBounds, view.hostBounds)) continue
        view.clipNode?.takeIf { it.hasDisplayList() }?.let { canvas.drawRenderNode(it) }
      }
      return
    }
    canvas.drawRenderNode(content)
    if (upTo == null) return
    for (view in order) {
      if (view === upTo) break
      if (!view.flat || !RectF.intersects(upTo.hostBounds, view.hostBounds)) continue
      view.clipNode?.takeIf { it.hasDisplayList() }?.let { canvas.drawRenderNode(it) }
    }
  }

  internal fun overlapsEarlier(target: GlassBackdrops): Boolean {
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
    refreshTone()
    toneCount = -1
    if (lifted.isEmpty()) {
      if (offscreen) return
      if (toned) {
        recordTone(recorder, 0)
        toneLayer?.let { canvas.drawRenderNode(it) }
      } else {
        canvas.drawRenderNode(recorder)
      }
      return
    }
    sortLifted()
    toGlobal.reset()
    transformMatrixToGlobal(toGlobal)
    toGlobal.invert(toHost)
    for ((index, view) in order.withIndex()) {
      if (toned && view.aboveTone && toneCount < 0) recordTone(recorder, index)
      view.recordLifted(this, toHost)
    }
    if (toned && toneCount < 0) recordTone(recorder, order.size)
    composite.setPosition(0, 0, width, height)
    composite.setClipToBounds(false)
    val out = composite.beginRecording(width, height)
    try {
      val layer = toneLayer
      if (toned && layer != null) {
        out.drawRenderNode(layer)
        for ((index, view) in order.withIndex()) {
          if (index < toneCount && !view.aboveTone) continue
          view.clipNode?.takeIf { it.hasDisplayList() }?.let { out.drawRenderNode(it) }
        }
      } else {
        out.drawRenderNode(recorder)
        for (view in order) view.clipNode?.takeIf { it.hasDisplayList() }?.let { out.drawRenderNode(it) }
      }
    } finally {
      composite.endRecording()
    }
    if (!offscreen) canvas.drawRenderNode(composite)
  }
}
