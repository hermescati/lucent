package expo.modules.lucent

import android.app.ActivityManager
import android.content.Context
import android.database.ContentObserver
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.RenderEffect
import android.graphics.RenderNode
import android.graphics.RuntimeShader
import android.graphics.Shader
import android.os.Build
import android.os.SystemClock
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.annotation.SuppressLint
import android.view.MotionEvent
import android.view.PixelCopy
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.uimanager.ReactOverflowView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

class GlassView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  var group: String = GlassRegistry.DEFAULT_GROUP
  var underlay: String? = null
  var overlay: String? = null
  var shapes: FloatArray? = null
  var inset = 0f
  var cornerRadius = 0f
  var blend = 0f
  var blurRadius = 0f
  var bezel = 0f
  var refraction = 0f
  var refractOutward = false
  var refractOutwardY: Boolean? = null
  var refractionYScale = 1f
  var falloff = 0f
  var dispersion = 0f
  var magnify = 0f
  var saturation = 1f
  var adaptive = 0f
  var dim = 0f
  var lightAngle = DEFAULT_LIGHT_ANGLE
  var specular = 0f
  var highlightWidth = DEFAULT_HIGHLIGHT_WIDTH
  var edgeSharp = 0f
  var edgeSoft = 0f
  var sharpWidth = 0f
  var softWidth = 0f
  var glowX = 0f
  var glowY = 0f
  var glowSpread = 0f
  var glowStrength = 0f
  var shadowRadius = 0f
  var shadowOffset = 0f
  var shadowSpread = 0f
  var pinch = 0f
  var pinchWidth = 0f
  var pinchSpread = 0f
  var rimPrism = 0f
  var rimWidth = 2f
  var rimOutside = false
  var rimSide = 1f
  var edgeAxis = 0f
  var prismAxis = 0f
  var prismShift = 0f
  var insetShade = 0f
  var insetOffset = 0f
  var insetBlur = 0f
  var pinchLeft = 0f
  var pinchRight = 0f
  var sampleMaxX = 0f
  var ellipse = 0f
  var wallSide = 0f
  var wallRound = 1f
  var wallLead = 1f
  var topBend = 1f
  var topDepth = 1f
  var pullBottom = 0f
  var pullBand = 1f
  var pullTop = 0f
  var pullTopBand = 1f
  var rimOut = 0f
  var rimOutBand = 1f
  var wideRadius = 0f
  var wideMix = 0f
  var frost = 0f
  var frostClear = 0f
  var frostRadius = 0f
  var toneBase = 0f
  var toneGain = 1f
  var toneGamma = 1f
  var toneOn = 0f
  var frostBase = 0f
  var frostGain = 1f
  var frostGamma = 1f
  var frostChroma = 1f
  var sampleBackdrop = false
    set(value) {
      field = value
      scheduleSample()
    }
  private val onBackdropLuma by EventDispatcher()
  private var lastLuma = -1f
  private var sampling = false
  private val sampleBitmap by lazy { Bitmap.createBitmap(SAMPLE_SIZE, SAMPLE_SIZE, Bitmap.Config.ARGB_8888) }
  private val samplePixels = IntArray(SAMPLE_SIZE * SAMPLE_SIZE)
  private val sampleRunnable = Runnable { sampleOnce() }
  var frostLeft = 0f
  var frostTop = 0f
  var frostRight = 0f
  var frostBottom = 0f
  var chroma = 1f
  var clipLeft = 0f
  var clipTop = 0f
  var clipRight = 0f
  var clipBottom = 0f
  var clipScaleX = 1f
  var clipScaleY = 1f
  var clipSoft = 0f
  var clipOn = 0f
  var tint: Color = TRANSPARENT
  var rim: Color = TRANSPARENT
  var fallback: Color = TRANSPARENT
  var shadow: Color = TRANSPARENT
  var plain = false
  var alphaPass = false
  var lift = false
    set(value) {
      if (field == value) return
      field = value
      updateHost()
    }
  var outset = 0f
  var presence = 1f
  var effectTint: Color = TRANSPARENT
  var interactive = false
  var pressScale = 1f
  var pressGlow = 0f
  var pressGlowSpread = 0f

  private var host: GlassBackdropView? = null
  private var drawingLifted = false
  private val glassNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassLayer") else null
  private val liftNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassLift") else null
  internal val clipNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassClip") else null
  private val liftMatrix = Matrix()
  private val ancestorMatrix = Matrix()
  private val liftClip = RectF()
  internal val hostBounds = RectF()
  internal var flat = true
  private val ancestorRect = RectF()
  private var press = 0f
  private var pressVelocity = 0f
  private var pressTarget = 0f
  private var touchX = 0f
  private var touchY = 0f
  private var glowFollowX = 0f
  private var glowFollowY = 0f
  private var lastFrame = 0L

  private val density = resources.displayMetrics.density
  private val selfToGlobal = Matrix()
  private val backdropToGlobal = Matrix()
  private val backdropToSelf = Matrix()
  private val inverse = Matrix()
  private val shapeBuffer = FloatArray(MAX_SHAPES * 4)
  private val wallRadii = FloatArray(8)
  private val state = FloatArray(STATE_SIZE)
  private val lastState = FloatArray(STATE_SIZE) { Float.NaN }
  private var reducedTransparency = false
  private var effect: RenderEffect? = null
  private val shader: RuntimeShader? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      try {
        RuntimeShader(GLASS_SHADER)
      } catch (_: IllegalArgumentException) {
        null
      }
    } else {
      null
    }

  private val lowRam =
    (context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager)?.isLowRamDevice ?: false
  private val plainNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassPlain") else null
  private val wideNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassWide") else null
  private var wideSigma = -1f
  private var plainBlur = -1f
  private val plainPath = Path()
  private val shapePath = Path()
  private val clipPath = Path()
  private val shapeRect = RectF()
  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
  private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)

  private val usesShader: Boolean
    get() = shader != null && !lowRam && !plain

  private val outPx: Float
    get() = outset * density

  private val layerWidth: Float
    get() = width + outPx * 2f

  private val layerHeight: Float
    get() = height + outPx * 2f

  private val activeTint: Color
    get() =
      if (effectTint.alpha() > 0f) {
        Color.valueOf(effectTint.red(), effectTint.green(), effectTint.blue(), effectTint.alpha() * TINT_STRENGTH)
      } else {
        tint
      }

  private val preDraw = ViewTreeObserver.OnPreDrawListener {
    stepPress()
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

  private fun updateHost() {
    var found: GlassBackdropView? = null
    if (lift && isAttachedToWindow) {
      var parent = parent
      while (parent is View) {
        if (parent is GlassBackdropView && !parent.offscreen) {
          found = parent
          break
        }
        parent = parent.parent
      }
    }
    if (found === host) return
    host?.removeLifted(this)
    host = found
    found?.addLifted(this)
    invalidate()
  }

  private val lifted: Boolean
    get() = host != null

  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    val handled = super.dispatchTouchEvent(event)
    if (!interactive) return handled
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        touchX = event.x / density
        touchY = event.y / density
        glowFollowX = touchX
        glowFollowY = touchY
        pressTarget = 1f
        invalidate()
        return true
      }
      MotionEvent.ACTION_MOVE -> {
        touchX = event.x / density
        touchY = event.y / density
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> pressTarget = 0f
    }
    return handled || pressTarget > 0f
  }

  private fun stepPress() {
    val now = SystemClock.uptimeMillis()
    val dt = if (lastFrame == 0L) 0f else ((now - lastFrame) / 1000f).coerceAtMost(MAX_STEP)
    lastFrame = now
    if (dt <= 0f) return
    val omega = 2f * Math.PI.toFloat() / PRESS_PERIOD
    val pull = omega * omega * (pressTarget - press) - 2f * omega * pressVelocity
    pressVelocity += pull * dt
    press += pressVelocity * dt
    if (kotlin.math.abs(press - pressTarget) < 1e-3f && kotlin.math.abs(pressVelocity) < 1e-2f) {
      press = pressTarget
      pressVelocity = 0f
    }
    val follow = 1f - exp(-dt / FOLLOW_TIME)
    glowFollowX += (touchX - glowFollowX) * follow
    glowFollowY += (touchY - glowFollowY) * follow
    if (interactive) updateEffect()
  }

  private val currentScale: Float
    get() = 1f + (pressScale - 1f) * press

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    updateHost()
    viewTreeObserver.addOnPreDrawListener(preDraw)
    context.contentResolver.registerContentObserver(Settings.Secure.getUriFor(HIGH_TEXT_CONTRAST), false, contrastObserver)
    reducedTransparency = readReducedTransparency()
    updateEffect()
    scheduleSample()
  }

  private fun scheduleSample() {
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

  private fun quantize(value: Float): Float = (value * SHAPE_STEPS).roundToInt() / SHAPE_STEPS

  private fun fillShapes(): Int {
    val source = shapes
    if (source == null || source.size < 4) {
      val pad = inset * density + outPx
      shapeBuffer[0] = pad
      shapeBuffer[1] = pad
      shapeBuffer[2] = layerWidth - pad
      shapeBuffer[3] = layerHeight - pad
      for (i in 4 until shapeBuffer.size) {
        shapeBuffer[i] = 0f
      }
      return 1
    }
    val count = minOf(source.size / 4, MAX_SHAPES)
    for (i in 0 until count * 4) {
      shapeBuffer[i] = quantize(source[i] * density + outPx)
    }
    for (i in count * 4 until shapeBuffer.size) {
      shapeBuffer[i] = 0f
    }
    return count
  }

  private fun shortestSide(count: Int): Float {
    var side = Float.MAX_VALUE
    for (i in 0 until count) {
      val w = shapeBuffer[i * 4 + 2] - shapeBuffer[i * 4]
      val h = shapeBuffer[i * 4 + 3] - shapeBuffer[i * 4 + 1]
      if (w > 0f && h > 0f) side = min(side, min(w, h))
    }
    return if (side == Float.MAX_VALUE) 0f else side
  }

  private fun blur(radiusPx: Float): RenderEffect? {
    return if (radiusPx > 0f) RenderEffect.createBlurEffect(radiusPx, radiusPx, Shader.TileMode.CLAMP) else null
  }

  private fun putColor(index: Int, color: Color): Int {
    state[index] = color.red()
    state[index + 1] = color.green()
    state[index + 2] = color.blue()
    state[index + 3] = color.alpha()
    return index + 4
  }

  fun updateEffect() {
    if (!usesShader) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) glassNode?.setRenderEffect(null)
      lastState.fill(Float.NaN)
      effect = null
      invalidate()
      return
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val opaque = reducedTransparency && fallback.alpha() > 0f
    val blurPx = if (opaque) 0f else blurRadius * density
    val glassShader = shader?.takeIf { width > 0 && height > 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU }

    if (glassShader == null) {
      state.fill(0f)
      state[0] = blurPx
      if (!state.contentEquals(lastState)) {
        effect = blur(blurPx)
        state.copyInto(lastState)
      }
      glassNode?.setRenderEffect(effect)
      return
    }

    val count = fillShapes()
    val side = shortestSide(count)
    val reference = REFERENCE_SIDE * density
    val bezelPx = min(bezel * density, side * BEZEL_RATIO).coerceAtLeast(MIN_BAND)
    val refractionPx = if (opaque) 0f else min(refraction * density, side * REFRACTION_RATIO * min(1f, side / reference))
    val highlightPx = min(highlightWidth * density, side * HIGHLIGHT_RATIO).coerceAtLeast(MIN_BAND)
    val angle = Math.toRadians(lightAngle.toDouble())

    var i = 0
    state[i++] = blurPx
    state[i++] = layerWidth
    state[i++] = layerHeight
    shapeBuffer.copyInto(state, i)
    i += shapeBuffer.size
    state[i++] = count.toFloat()
    state[i++] = cornerRadius * density
    state[i++] = blend * density
    state[i++] = bezelPx
    state[i++] = refractionPx
    state[i++] = if (refractOutward) 1f else -1f
    state[i++] = (if (refractOutwardY ?: refractOutward) 1f else -1f) * refractionYScale
    state[i++] = falloff
    state[i++] = if (opaque) 0f else dispersion
    state[i++] = if (opaque) 0f else magnify
    state[i++] = if (opaque) 1f else saturation
    state[i++] = if (opaque) 0f else adaptive
    state[i++] = if (opaque) 0f else dim
    state[i++] = cos(angle).toFloat()
    state[i++] = sin(angle).toFloat()
    state[i++] = specular
    state[i++] = highlightPx
    state[i++] = edgeSharp
    state[i++] = edgeSoft
    state[i++] = sharpWidth * density
    state[i++] = softWidth * density
    state[i++] = (if (interactive) glowFollowX else glowX) * density + outPx
    state[i++] = (if (interactive) glowFollowY else glowY) * density + outPx
    state[i++] = (if (interactive) pressGlowSpread else glowSpread) * density
    state[i++] = if (opaque) 0f else if (interactive) pressGlow * press else glowStrength
    state[i++] = shadowRadius * density
    state[i++] = shadowOffset * density
    state[i++] = shadowSpread * density
    state[i++] = if (opaque) 0f else pinch * density
    state[i++] = pinchWidth * density
    state[i++] = if (opaque) 0f else pinchSpread
    state[i++] = if (opaque) 0f else rimPrism
    state[i++] = rimWidth
    state[i++] = if (rimOutside) 1f else 0f
    state[i++] = rimSide
    state[i++] = edgeAxis
    state[i++] = if (opaque) 0f else prismAxis
    state[i++] = if (opaque) 0f else prismShift * density
    state[i++] = if (opaque) 0f else insetShade
    state[i++] = insetOffset * density
    state[i++] = insetBlur * density
    state[i++] = if (opaque) 0f else pinchLeft * density
    state[i++] = if (opaque) 0f else pinchRight * density
    state[i++] = sampleMaxX * density
    state[i++] = ellipse
    state[i++] = wallSide
    state[i++] = wallRound
    state[i++] = wallLead
    state[i++] = clipLeft * density
    state[i++] = clipTop * density
    state[i++] = clipRight * density
    state[i++] = clipBottom * density
    state[i++] = clipScaleX
    state[i++] = clipScaleY
    state[i++] = clipSoft * density
    state[i++] = clipOn
    state[i++] = topBend
    state[i++] = topDepth
    state[i++] = if (opaque) 1f else chroma
    state[i++] = if (opaque) 0f else pullBottom * density
    state[i++] = pullBand * density
    state[i++] = if (opaque) 0f else pullTop * density
    state[i++] = pullTopBand * density
    state[i++] = if (opaque) 0f else rimOut * density
    state[i++] = rimOutBand * density
    state[i++] = frostLeft * density + outPx
    state[i++] = frostTop * density + outPx
    state[i++] = frostRight * density + outPx
    state[i++] = frostBottom * density + outPx
    state[i++] = if (opaque) 0f else frost
    state[i++] = frostClear
    state[i++] = frostRadius * density
    state[i++] = toneBase
    state[i++] = toneGain
    state[i++] = toneGamma
    state[i++] = if (opaque) 0f else toneOn
    state[i++] = frostBase
    state[i++] = frostGain
    state[i++] = frostGamma
    state[i++] = frostChroma
    i = putColor(i, if (opaque) fallback else activeTint)
    i = putColor(i, rim)
    putColor(i, shadow)
    if (state.contentEquals(lastState)) {
      glassNode?.setRenderEffect(effect)
      return
    }

    var u = 3 + shapeBuffer.size
    glassShader.setFloatUniform("size", state[1], state[2])
    glassShader.setFloatUniform("shapes", shapeBuffer)
    glassShader.setFloatUniform("shapeCount", state[u++])
    glassShader.setFloatUniform("radius", state[u++])
    glassShader.setFloatUniform("blend", state[u++])
    glassShader.setFloatUniform("bezel", state[u++])
    glassShader.setFloatUniform("refraction", state[u++])
    glassShader.setFloatUniform("direction", state[u++])
    glassShader.setFloatUniform("directionY", state[u++])
    glassShader.setFloatUniform("falloff", state[u++])
    glassShader.setFloatUniform("dispersion", state[u++])
    glassShader.setFloatUniform("magnify", state[u++])
    glassShader.setFloatUniform("saturation", state[u++])
    glassShader.setFloatUniform("adaptive", state[u++])
    glassShader.setFloatUniform("dim", state[u++])
    glassShader.setFloatUniform("light", state[u], state[u + 1])
    u += 2
    glassShader.setFloatUniform("specular", state[u++])
    glassShader.setFloatUniform("highlightWidth", state[u++])
    glassShader.setFloatUniform("edgeSharp", state[u++])
    glassShader.setFloatUniform("edgeSoft", state[u++])
    glassShader.setFloatUniform("sharpWidth", state[u++])
    glassShader.setFloatUniform("softWidth", state[u++])
    glassShader.setFloatUniform("glowCenter", state[u], state[u + 1])
    u += 2
    glassShader.setFloatUniform("glowSpread", state[u++])
    glassShader.setFloatUniform("glowStrength", state[u++])
    glassShader.setFloatUniform("shadowRadius", state[u++])
    glassShader.setFloatUniform("shadowOffset", state[u++])
    glassShader.setFloatUniform("shadowSpread", state[u++])
    glassShader.setFloatUniform("pinch", state[u++])
    glassShader.setFloatUniform("pinchWidth", state[u++])
    glassShader.setFloatUniform("pinchSpread", state[u++])
    glassShader.setFloatUniform("rimPrism", state[u++])
    glassShader.setFloatUniform("rimWidth", state[u++])
    glassShader.setFloatUniform("rimOutside", state[u++])
    glassShader.setFloatUniform("rimSide", state[u++])
    glassShader.setFloatUniform("axis", state[u], state[u + 1], state[u + 2])
    u += 3
    glassShader.setFloatUniform("insetShade", state[u++])
    glassShader.setFloatUniform("insetOffset", state[u++])
    glassShader.setFloatUniform("insetBlur", state[u++])
    glassShader.setFloatUniform("pinchLeft", state[u++])
    glassShader.setFloatUniform("pinchRight", state[u++])
    glassShader.setFloatUniform("sampleMaxX", state[u++])
    glassShader.setFloatUniform("ellipse", state[u++])
    glassShader.setFloatUniform("wall", state[u], state[u + 1], state[u + 2])
    u += 3
    glassShader.setFloatUniform("clipRect", state[u], state[u + 1], state[u + 2], state[u + 3])
    u += 4
    glassShader.setFloatUniform("clipScale", state[u], state[u + 1])
    u += 2
    glassShader.setFloatUniform("clipSoft", state[u++])
    glassShader.setFloatUniform("clipOn", state[u++])
    glassShader.setFloatUniform("topBend", state[u++])
    glassShader.setFloatUniform("topDepth", state[u++])
    glassShader.setFloatUniform("chroma", state[u++])
    glassShader.setFloatUniform("edgeY", state[u], state[u + 1])
    u += 2
    glassShader.setFloatUniform("edgeTop", state[u], state[u + 1])
    u += 2
    glassShader.setFloatUniform("rimOut", state[u], state[u + 1])
    u += 2
    glassShader.setFloatUniform("frostRect", state[u], state[u + 1], state[u + 2], state[u + 3])
    u += 4
    glassShader.setFloatUniform("frost", state[u++])
    glassShader.setFloatUniform("frostClear", state[u++])
    glassShader.setFloatUniform("frostRadius", state[u++])
    glassShader.setFloatUniform("tone", state[u], state[u + 1], state[u + 2], state[u + 3])
    u += 4
    glassShader.setFloatUniform("frostTone", state[u], state[u + 1], state[u + 2], state[u + 3])
    glassShader.setColorUniform("tint", if (opaque) fallback else activeTint)
    glassShader.setColorUniform("rim", rim)
    glassShader.setColorUniform("shadow", shadow)
    glassShader.setFloatUniform("alphaPass", if (alphaPass) 1f else 0f)

    val glass = RenderEffect.createRuntimeShaderEffect(glassShader, "content")
    val inner = blur(blurPx)
    effect = if (inner != null) RenderEffect.createChainEffect(glass, inner) else glass
    state.copyInto(lastState)
    glassNode?.setRenderEffect(effect)
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    if (lifted && !drawingLifted) return
    val scale = currentScale
    canvas.save()
    canvas.scale(scale, scale, width * 0.5f, height * 0.5f)
    drawGlass(canvas)
    canvas.restore()
  }

  override fun dispatchDraw(canvas: Canvas) {
    if (lifted && !drawingLifted) return
    val scale = currentScale
    canvas.save()
    canvas.scale(scale, scale, width * 0.5f, height * 0.5f)
    super.dispatchDraw(canvas)
    canvas.restore()
  }

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

  internal fun recordLifted(owner: GlassBackdropView, hostInverse: Matrix) {
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
      val scale = currentScale
      recording.save()
      recording.scale(scale, scale, width * 0.5f, height * 0.5f)
      drawGlass(recording)
      super.dispatchDraw(recording)
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

  private fun prepareBackdrop(): Boolean {
    selfToGlobal.reset()
    transformMatrixToGlobal(selfToGlobal)
    val scale = currentScale
    if (scale != 1f) selfToGlobal.preScale(scale, scale, width * 0.5f, height * 0.5f)
    return selfToGlobal.invert(inverse)
  }

  private fun drawBackdrops(canvas: Canvas) {
    val owner = host
    if (owner != null) {
      drawHost(canvas, owner)
      return
    }
    underlay?.let { drawBackdrop(canvas, it) }
    drawBackdrop(canvas, group)
    overlay?.let { drawBackdrop(canvas, it) }
  }

  private fun drawHost(canvas: Canvas, owner: GlassBackdropView) {
    backdropToGlobal.reset()
    owner.transformMatrixToGlobal(backdropToGlobal)
    backdropToSelf.set(inverse)
    backdropToSelf.preConcat(backdropToGlobal)
    canvas.save()
    canvas.concat(backdropToSelf)
    owner.drawSource(canvas, this)
    canvas.restore()
  }

  private fun buildPlainPath(): Boolean {
    val count = fillShapes()
    plainPath.reset()
    val corner = cornerRadius * density
    var any = false
    for (i in 0 until count) {
      val left = shapeBuffer[i * 4]
      val top = shapeBuffer[i * 4 + 1]
      val right = shapeBuffer[i * 4 + 2]
      val bottom = shapeBuffer[i * 4 + 3]
      if (right - left <= 0f || bottom - top <= 0f) continue
      shapeRect.set(left, top, right, bottom)
      shapePath.reset()
      if (i == 0 && ellipse >= 0.5f) {
        shapePath.addOval(shapeRect, Path.Direction.CW)
      } else {
        var r = min(right - left, bottom - top) * 0.5f
        if (corner > 0f) r = min(r, corner)
        if (i == 0 && wallSide != 0f) {
          val tight = r * wallRound
          val lead = r * wallLead
          val leftR = if (wallSide < 0f) tight else lead
          val rightR = if (wallSide > 0f) tight else lead
          wallRadii[0] = leftR
          wallRadii[1] = leftR
          wallRadii[2] = rightR
          wallRadii[3] = rightR
          wallRadii[4] = rightR
          wallRadii[5] = rightR
          wallRadii[6] = leftR
          wallRadii[7] = leftR
          shapePath.addRoundRect(shapeRect, wallRadii, Path.Direction.CW)
        } else {
          shapePath.addRoundRect(shapeRect, r, r, Path.Direction.CW)
        }
      }
      if (any) plainPath.op(shapePath, Path.Op.UNION) else plainPath.set(shapePath)
      any = true
    }
    if (any && clipOn >= 0.5f) {
      val sx = clipScaleX.coerceAtLeast(0.01f)
      val sy = clipScaleY.coerceAtLeast(0.01f)
      val cl = clipLeft * density
      val ct = clipTop * density
      val cr = clipRight * density
      val cb = clipBottom * density
      val r = min(cr - cl, cb - ct).coerceAtLeast(0f) * 0.5f
      shapeRect.set(layerWidth * 0.5f + cl / sx, layerHeight * 0.5f + ct / sy, layerWidth * 0.5f + cr / sx, layerHeight * 0.5f + cb / sy)
      clipPath.reset()
      clipPath.addRoundRect(shapeRect, r / sx, r / sy, Path.Direction.CW)
      plainPath.op(clipPath, Path.Op.INTERSECT)
    }
    return any
  }

  private fun drawEdge(canvas: Canvas, depth: Float, strength: Float) {
    if (depth <= 0f || strength <= 0f) return
    val peak = Color.argb(strength.coerceIn(0f, 1f), 1f, 1f, 1f)
    strokePaint.shader = LinearGradient(
      0f,
      shapeRect.top,
      0f,
      shapeRect.bottom,
      intArrayOf(peak, Color.TRANSPARENT, Color.TRANSPARENT, peak),
      EDGE_STOPS,
      Shader.TileMode.CLAMP,
    )
    strokePaint.color = Color.WHITE
    strokePaint.strokeWidth = depth * 2f
    canvas.drawPath(plainPath, strokePaint)
  }

  private fun drawPlain(canvas: Canvas) {
    if (width <= 0 || height <= 0 || !buildPlainPath()) return
    val tint = activeTint
    val opaque = reducedTransparency && fallback.alpha() > 0f
    val blurPx = if (opaque) 0f else blurRadius * density
    val canBlur = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && canvas.isHardwareAccelerated && plainNode != null

    if (shadow.alpha() > 0f && shadowRadius > 0f) {
      canvas.save()
      canvas.clipOutPath(plainPath)
      shadowPaint.color = Color.BLACK
      shadowPaint.setShadowLayer(shadowRadius * density, 0f, shadowOffset * density, shadow.toArgb())
      canvas.drawPath(plainPath, shadowPaint)
      canvas.restore()
    }

    if (canBlur && !opaque && prepareBackdrop()) {
      val node = plainNode!!
      node.setPosition(0, 0, layerWidth.roundToInt(), layerHeight.roundToInt())
      if (blurPx != plainBlur) {
        node.setRenderEffect(blur(blurPx))
        plainBlur = blurPx
      }
      val recording = node.beginRecording(layerWidth.roundToInt(), layerHeight.roundToInt())
      try {
        recording.translate(outPx, outPx)
        drawBackdrops(recording)
      } finally {
        node.endRecording()
      }
      canvas.save()
      canvas.clipPath(plainPath)
      canvas.drawRenderNode(node)
      canvas.restore()
      fillPaint.color = activeTint.toArgb()
    } else {
      fillPaint.color = (if (fallback.alpha() > 0f) fallback else tint).toArgb()
    }
    canvas.drawPath(plainPath, fillPaint)

    if (adaptive > 0f && !opaque) {
      val lightTint = 0.2126f * tint.red() + 0.7152f * tint.green() + 0.0722f * tint.blue() > 0.5f
      fillPaint.color =
        if (lightTint) Color.argb(ADAPTIVE_DARKEN * adaptive, 0f, 0f, 0f) else Color.argb(ADAPTIVE_LIFT * adaptive, 1f, 1f, 1f)
      canvas.drawPath(plainPath, fillPaint)
    }

    if (glowStrength > 0f && !opaque && glowSpread > 0f) {
      val spread = glowSpread * density * GLOW_REACH
      val peak = Color.argb(glowStrength.coerceIn(0f, 1f), 1f, 1f, 1f)
      glowPaint.shader = RadialGradient(glowX * density + outPx, glowY * density + outPx, spread, peak, Color.TRANSPARENT, Shader.TileMode.CLAMP)
      canvas.drawPath(plainPath, glowPaint)
    }

    if (edgeSharp > 0f || edgeSoft > 0f) {
      plainPath.computeBounds(shapeRect, false)
      canvas.save()
      canvas.clipPath(plainPath)
      drawEdge(canvas, softWidth * density, edgeSoft * EDGE_SOFT_STRENGTH)
      drawEdge(canvas, sharpWidth * density, edgeSharp * EDGE_SHARP_STRENGTH)
      canvas.restore()
      strokePaint.shader = null
    }

    if (rim.alpha() > 0f) {
      canvas.save()
      if (rimOutside) canvas.clipOutPath(plainPath) else canvas.clipPath(plainPath)
      strokePaint.strokeWidth = rimWidth * 2f
      strokePaint.color = rim.toArgb()
      canvas.drawPath(plainPath, strokePaint)
      canvas.restore()
    }
  }

  private fun drawBackdrop(canvas: Canvas, name: String) {
    val backdrop = GlassRegistry.backdrop(name) ?: return
    val node = backdrop.visibleNode ?: return
    if (!node.hasDisplayList()) return
    backdropToGlobal.reset()
    backdrop.transformMatrixToGlobal(backdropToGlobal)
    backdropToSelf.set(inverse)
    backdropToSelf.preConcat(backdropToGlobal)
    canvas.save()
    canvas.concat(backdropToSelf)
    canvas.drawRenderNode(node)
    canvas.restore()
  }

  private companion object {
    val TRANSPARENT: Color = Color.valueOf(0f, 0f, 0f, 0f)
    const val HIGH_TEXT_CONTRAST = "high_text_contrast_enabled"
    const val DEFAULT_LIGHT_ANGLE = 30f
    const val DEFAULT_HIGHLIGHT_WIDTH = 2f
    const val SHAPE_STEPS = 4f
    const val REFERENCE_SIDE = 110f
    const val BEZEL_RATIO = 0.5f
    const val REFRACTION_RATIO = 1.2f
    const val WIDE_SIGMA_RATIO = 0.6f
    const val HIGHLIGHT_RATIO = 0.05f
    const val MIN_BAND = 2f
    const val GLOW_REACH = 2.5f
    const val EDGE_SHARP_STRENGTH = 1.2f
    const val EDGE_SOFT_STRENGTH = 0.6f
    val EDGE_STOPS = floatArrayOf(0f, 0.3f, 0.7f, 1f)
    const val ADAPTIVE_LIFT = 0.14f
    const val ADAPTIVE_DARKEN = 0.22f
    const val STATE_SIZE = 3 + MAX_SHAPES * 4 + 59 + 36
    const val SAMPLE_SIZE = 8
    const val SAMPLE_INTERVAL_MS = 16L
    const val SAMPLE_INSET = 6f
    const val SAMPLE_WIDTH = 8f
    const val SAMPLE_STEP = 0.015f
    const val TINT_STRENGTH = 0.5f
    const val PRESS_PERIOD = 0.32f
    const val FOLLOW_TIME = 0.05f
    const val MAX_STEP = 0.05f
  }
}
