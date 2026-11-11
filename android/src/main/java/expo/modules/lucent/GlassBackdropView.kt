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
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ReactPointerEventsView

class GlassBackdropView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), GlassSupport.Listener, ReactPointerEventsView {
  // React's pointerEvents, which only its own views read on their own: "box-none" for a backdrop laid over other views,
  // as the bottom accessory's is over the tab bar's row. Left "auto", it takes touches on its empty parts, so a screen's
  // backdrop keeps taps on its background from reaching a screen under it.
  override var pointerEvents: PointerEvents = PointerEvents.AUTO

  internal val node: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassBackdrop") else null
  internal val outNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassBackdropOut") else null

  private val lifted = LinkedHashSet<GlassBackdrops>()
  private val order = ArrayList<GlassBackdrops>()
  private var orderDirty = false
  // Lifted glass the last look through the tree missed, and for how many frames: a stack moving a screen as another is
  // pushed draws it for a frame without it being one of its children, and its glass would go with it for that frame.
  private val held = HashMap<GlassBackdrops, Int>()
  private val toGlobal = Matrix()
  private val toHost = Matrix()

  init {
    GlassSupport.track(this)
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

  // Recorded again for glass drawn at the new level, which may sample it differently.
  override fun glassSupportChanged() {
    invalidate()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    GlassRegistry.register(group, this)
  }

  override fun onDetachedFromWindow() {
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
    val previous = ArrayList(order)
    order.clear()
    for (i in 0 until childCount) collect(getChildAt(i))
    orderDirty = false
    // Glass still lifted but not found keeps its place and its last drawing for a few frames, and the tree is looked
    // through again on the next: gone for longer, it's let go.
    for ((index, view) in previous.withIndex()) {
      if (view !in lifted || view in order) {
        held.remove(view)
        continue
      }
      val frames = (held[view] ?: 0) + 1
      if (frames > HOLD_FRAMES) {
        held.remove(view)
        continue
      }
      held[view] = frames
      order.add(minOf(index, order.size), view)
      orderDirty = true
    }
    held.keys.retainAll(order.toSet())
    if (orderDirty) postInvalidateOnAnimation()
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
      if (view !in held) view.recordLifted(this, toHost)
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

private const val HOLD_FRAMES = 3
