package expo.modules.lucent

import android.content.Context
import android.database.ContentObserver
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.RenderEffect
import android.graphics.RenderNode
import android.graphics.Shader
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.annotation.SuppressLint
import android.view.PixelCopy
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.uimanager.ReactOverflowView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToInt

class GlassView(context: Context, appContext: AppContext) : GlassPlain(context, appContext) {
  private val onBackdropLuma by EventDispatcher()
  private var lastLuma = -1f
  private var sampling = false
  private val sampleBitmap by lazy { Bitmap.createBitmap(SAMPLE_SIZE, SAMPLE_SIZE, Bitmap.Config.ARGB_8888) }
  private val samplePixels = IntArray(SAMPLE_SIZE * SAMPLE_SIZE)
  private val sampleRunnable = Runnable { sampleOnce() }

  private var drawingLifted = false

  private val liftNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassLift") else null

  private val liftMatrix = Matrix()
  private val ancestorMatrix = Matrix()
  private val liftClip = RectF()

  private val ancestorRect = RectF()

  private val wideNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassWide") else null
  private var wideSigma = -1f

  private val preDraw = ViewTreeObserver.OnPreDrawListener {
    stepPress()
    if (lifted && !interactive && !pressesShapes) updateEffect()
    invalidate()
    true
  }

  private val contrastObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
    override fun onChange(selfChange: Boolean) {
      reducedTransparency = readReducedTransparency()
      updateEffect()
    }
  }

  init {
    setWillNotDraw(false)
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) = Unit

  @SuppressLint("MissingSuperCall")
  override fun requestLayout() = Unit

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    updateHost()
    viewTreeObserver.addOnPreDrawListener(preDraw)
    context.contentResolver.registerContentObserver(Settings.Secure.getUriFor(HIGH_TEXT_CONTRAST), false, contrastObserver)
    reducedTransparency = readReducedTransparency()
    updateEffect()
    scheduleSample()
  }

  override fun scheduleSample() {
    removeCallbacks(sampleRunnable)
    if (sampleBackdrop && isAttachedToWindow) {
      postDelayed(sampleRunnable, SAMPLE_INTERVAL_MS)
    }
  }

  private fun sampleOnce() {
    val window = appContext.currentActivity?.window
    if (window == null || sampling || frost <= 0f || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      scheduleSample()
      return
    }
    val origin = IntArray(2)
    getLocationInWindow(origin)
    val edge = SAMPLE_INSET * density
    val left = (origin[0] + frostLeft * density + edge).roundToInt()
    val top = (origin[1] + frostTop * density + edge).roundToInt()
    val bottom = (origin[1] + frostBottom * density - edge).roundToInt()
    val right = left + (SAMPLE_WIDTH * density).roundToInt()
    if (bottom - top < 2 || right <= left) {
      scheduleSample()
      return
    }
    sampling = true
    PixelCopy.request(window, Rect(left, top, right, bottom), sampleBitmap, { result ->
      sampling = false
      if (result == PixelCopy.SUCCESS) {
        sampleBitmap.getPixels(samplePixels, 0, SAMPLE_SIZE, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
        var sum = 0f
        for (pixel in samplePixels) {
          sum += 0.2126f * Color.red(pixel) + 0.7152f * Color.green(pixel) + 0.0722f * Color.blue(pixel)
        }
        val luma = sum / samplePixels.size / 255f
        if (kotlin.math.abs(luma - lastLuma) > SAMPLE_STEP) {
          lastLuma = luma
          onBackdropLuma(mapOf("luma" to luma))
        }
      }
      scheduleSample()
    }, Handler(Looper.getMainLooper()))
  }

  override fun onDetachedFromWindow() {
    host?.removeLifted(this)
    host = null
    viewTreeObserver.removeOnPreDrawListener(preDraw)
    removeCallbacks(sampleRunnable)
    context.contentResolver.unregisterContentObserver(contrastObserver)
    super.onDetachedFromWindow()
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    updateEffect()
  }

  private fun readReducedTransparency(): Boolean =
    try {
      Settings.Secure.getInt(context.contentResolver, HIGH_TEXT_CONTRAST, 0) == 1
    } catch (_: Exception) {
      false
    }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    if (lifted && !drawingLifted) return
    canvas.save()
    applyPress(canvas)
    drawGlass(canvas)
    canvas.restore()
  }

  override fun dispatchDraw(canvas: Canvas) {
    if (lifted && !drawingLifted) return
    canvas.save()
    applyPress(canvas)
    drawChildren(canvas)
    canvas.restore()
  }

  private fun drawChildren(canvas: Canvas) {
    val source = shapes
    if (!clipContent || source == null || source.size < 4) {
      super.dispatchDraw(canvas)
      return
    }
    val left = source[0] * density
    val top = source[1] * density
    val right = source[2] * density
    val bottom = source[3] * density
    if (right <= left || bottom <= top) return
    val radius = min(cornerRadius * density, min(right - left, bottom - top) * 0.5f)
    contentPath.rewind()
    contentPath.addRoundRect(left, top, right, bottom, radius, radius, Path.Direction.CW)
    canvas.save()
    canvas.clipPath(contentPath)
    super.dispatchDraw(canvas)
    canvas.restore()
  }

  private val contentPath = Path()

  private fun drawGlass(canvas: Canvas) {
    if (presence <= 0f) return
    if (!usesShader) {
      if (presence < 1f) canvas.saveLayerAlpha(-outPx, -outPx, width + outPx, height + outPx, (presence * 255).roundToInt())
      canvas.save()
      canvas.translate(-outPx, -outPx)
      drawPlain(canvas)
      canvas.restore()
      if (presence < 1f) canvas.restore()
      return
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || !canvas.isHardwareAccelerated) return
    val node = glassNode ?: return
    if (!prepareBackdrop()) return
    val pad = outPx.roundToInt()
    node.setPosition(-pad, -pad, width + pad, height + pad)
    node.setClipToBounds(true)
    node.setAlpha(presence)
    val recording = node.beginRecording(width + pad * 2, height + pad * 2)
    try {
      recording.translate(pad.toFloat(), pad.toFloat())
      drawBackdrops(recording)
      drawWide(recording)
    } finally {
      node.endRecording()
    }
    canvas.drawRenderNode(node)
  }

  override fun recordLifted(owner: GlassBackdropView, hostInverse: Matrix) {
    val node = liftNode ?: return
    val clip = clipNode ?: return
    clip.setPosition(0, 0, owner.width, owner.height)
    clip.setClipToBounds(false)
    hostBounds.setEmpty()
    if (!isShown || width <= 0 || height <= 0) {
      clip.beginRecording().also { clip.endRecording() }
      return
    }
    liftMatrix.reset()
    transformMatrixToGlobal(liftMatrix)
    liftMatrix.postConcat(hostInverse)
    var alpha = 1f
    var clipped = false
    var view: View = this
    while (view !== owner) {
      alpha *= view.alpha
      val parent = view.parent as? View ?: break
      if (parent !== owner && parent is ReactOverflowView && parent.overflow != null && parent.overflow != "visible") {
        ancestorMatrix.reset()
        parent.transformMatrixToGlobal(ancestorMatrix)
        ancestorMatrix.postConcat(hostInverse)
        ancestorRect.set(0f, 0f, parent.width.toFloat(), parent.height.toFloat())
        ancestorMatrix.mapRect(ancestorRect)
        if (clipped) {
          if (!liftClip.intersect(ancestorRect)) liftClip.setEmpty()
        } else {
          liftClip.set(ancestorRect)
          clipped = true
        }
      }
      view = parent
    }
    if (alpha <= 0f || (clipped && liftClip.isEmpty)) {
      clip.beginRecording().also { clip.endRecording() }
      return
    }
    hostBounds.set(0f, 0f, width.toFloat(), height.toFloat())
    liftMatrix.mapRect(hostBounds)
    if (clipped && !hostBounds.intersect(liftClip)) {
      hostBounds.setEmpty()
      clip.beginRecording().also { clip.endRecording() }
      return
    }
    flat = !owner.overlapsEarlier(this)
    node.setPosition(0, 0, width, height)
    node.setClipToBounds(false)
    node.setAlpha(alpha)
    val recording = node.beginRecording(width, height)
    drawingLifted = true
    try {
      recording.save()
      applyPress(recording)
      drawGlass(recording)
      drawChildren(recording)
      recording.restore()
    } finally {
      drawingLifted = false
      node.endRecording()
    }
    val out = clip.beginRecording(owner.width, owner.height)
    try {
      if (clipped) out.clipRect(liftClip)
      out.concat(liftMatrix)
      out.drawRenderNode(node)
    } finally {
      clip.endRecording()
    }
  }

  private fun drawWide(canvas: Canvas) {
    val node = wideNode ?: return
    val sigma = wideRadius * density * WIDE_SIGMA_RATIO
    val opaque = reducedTransparency && fallback.alpha() > 0f
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || opaque || wideMix <= 0f || sigma <= 0f) return
    val pad = outPx.roundToInt()
    node.setPosition(-pad, -pad, width + pad, height + pad)
    node.setClipToBounds(true)
    if (sigma != wideSigma) {
      node.setRenderEffect(RenderEffect.createBlurEffect(sigma, sigma, Shader.TileMode.CLAMP))
      wideSigma = sigma
    }
    node.setAlpha(wideMix.coerceAtMost(1f))
    val recording = node.beginRecording(width + pad * 2, height + pad * 2)
    try {
      recording.translate(pad.toFloat(), pad.toFloat())
      drawBackdrops(recording)
    } finally {
      node.endRecording()
    }
    canvas.drawRenderNode(node)
  }
}
