package expo.modules.lucent

import android.app.ActivityManager
import android.content.Context
import android.graphics.BlendMode
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.RenderEffect
import android.graphics.RenderNode
import android.graphics.RuntimeShader
import android.graphics.Shader
import android.os.Build
import expo.modules.kotlin.AppContext
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/** Packs the shapes and shader values and builds the glass RenderEffect. */
abstract class GlassEffect(context: Context, appContext: AppContext) :
  GlassBackdrops(context, appContext), GlassSupport.Listener {
  protected val glassNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassLayer") else null

  protected val shapeBuffer = FloatArray(MAX_SHAPES * 4)

  private val state = FloatArray(STATE_SIZE)
  private val lastState = FloatArray(STATE_SIZE) { Float.NaN }
  protected var reducedTransparency = false
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

  private val toneShader: RuntimeShader? = if (shader != null) RuntimeShader(TONE_SHADER) else null
  private val hazeIn: RuntimeShader? = if (shader != null) RuntimeShader(HAZE_IN_SHADER) else null
  private val hazeOut: RuntimeShader? = if (shader != null) RuntimeShader(HAZE_OUT_SHADER) else null

  private val lowRam =
    (context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager)?.isLowRamDevice ?: false

  // High-contrast text draws solid glass too, as iOS's Reduce Transparency does.
  protected val usesShader: Boolean
    get() = shader != null && !lowRam && !plain && !reducedTransparency && GlassSupport.refracts

  override val pressesSolid: Boolean
    get() = !usesShader

  init {
    GlassSupport.track(this)
  }

  // Rebuilt, not just redrawn: the effect is otherwise rebuilt only when a prop changes, so a view back from a fallback
  // would keep the cleared one, and its contents (the lens's icons) would draw without it.
  override fun glassSupportChanged() {
    updateEffect()
    invalidate()
  }

  private val clipMatrix = Matrix()
  private val clipInverse = Matrix()
  private val clipPoints = FloatArray(4)

  private fun fillSampleClip(out: FloatArray, at: Int) {
    out[at] = -OPEN_CLIP
    out[at + 1] = -OPEN_CLIP
    out[at + 2] = OPEN_CLIP
    out[at + 3] = OPEN_CLIP
    if (!lifted || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
    clipMatrix.reset()
    transformMatrixToGlobal(clipMatrix)
    if (!clipMatrix.invert(clipInverse)) return
    val root = rootView ?: return
    clipPoints[0] = 0f
    clipPoints[1] = 0f
    clipPoints[2] = root.width.toFloat()
    clipPoints[3] = root.height.toFloat()
    clipInverse.mapPoints(clipPoints)
    out[at] = quantize(min(clipPoints[0], clipPoints[2]) + outPx)
    out[at + 1] = quantize(min(clipPoints[1], clipPoints[3]) + outPx)
    out[at + 2] = quantize(max(clipPoints[0], clipPoints[2]) + outPx)
    out[at + 3] = quantize(max(clipPoints[1], clipPoints[3]) + outPx)
  }

  private fun quantize(value: Float): Float = (value * SHAPE_STEPS).roundToInt() / SHAPE_STEPS

  protected fun fillShapes(): Int {
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
    if (pressedShape in 0 until count && press != 0f) {
      val (sx, sy) = shapeScale()
      val cx = (pressedRect.centerX() + shapeLeanX * PRESS_LEAN) * density + outPx
      val cy = (pressedRect.centerY() + shapeLeanY * PRESS_LEAN) * density + outPx
      val hw = pressedRect.width() * 0.5f * sx * density
      val hh = pressedRect.height() * 0.5f * sy * density
      val k = pressedShape * 4
      shapeBuffer[k] = cx - hw
      shapeBuffer[k + 1] = cy - hh
      shapeBuffer[k + 2] = cx + hw
      shapeBuffer[k + 3] = cy + hh
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

  protected fun blur(radiusPx: Float): RenderEffect? {
    return if (radiusPx > 0f) RenderEffect.createBlurEffect(radiusPx, radiusPx, Shader.TileMode.CLAMP) else null
  }

  /**
   * What the glass sees: the backdrop at the material's own blur, or, with haze, that at `weight`'s complement over a
   * Gaussian `radius` wide. A real blur rather than taps in the glass shader, which would print sparse sharp content
   * (text) as a ring of copies. It averages near linear light, as iOS 27 does, on a curve 8 bits a channel can carry
   * (HAZE_IN_SHADER).
   */
  private fun hazed(blurPx: Float, weight: Float, radiusPx: Float, first: RenderEffect?): RenderEffect? {
    // Each branch takes `first` (the tone, with tonePre) itself: a blend's branches read the raw content, not a chain's.
    fun after(effect: RenderEffect?) =
      if (first == null) effect else if (effect == null) first else RenderEffect.createChainEffect(effect, first)
    val near = after(blur(blurPx))
    if (weight <= 0f || radiusPx <= 0.5f) return near
    val spread = RenderEffect.createBlurEffect(radiusPx * 0.5f, radiusPx * 0.5f, Shader.TileMode.CLAMP)
    // Toned first (dark), detail already averages on the tone's curve, nearer iOS 27's without this.
    val inShader = hazeIn.takeIf { first == null }
    val outShader = hazeOut
    val wide = after(
      if (inShader == null || outShader == null) spread
      else RenderEffect.createChainEffect(
        RenderEffect.createRuntimeShaderEffect(outShader, "content"),
        RenderEffect.createChainEffect(spread, RenderEffect.createRuntimeShaderEffect(inShader, "content")),
      ),
    )
    val keep = ColorMatrix().apply { setScale(1f, 1f, 1f, 1f - weight) }
    val faint = RenderEffect.createColorFilterEffect(ColorMatrixColorFilter(keep))
    val sharp = if (near != null) RenderEffect.createChainEffect(faint, near) else faint
    return RenderEffect.createBlendModeEffect(wide!!, sharp, BlendMode.SRC_OVER)
  }

  private fun putColor(index: Int, color: Color): Int {
    state[index] = color.red()
    state[index + 1] = color.green()
    state[index + 2] = color.blue()
    state[index + 3] = color.alpha()
    return index + 4
  }

  override fun updateEffect() {
    if (!usesShader) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) glassNode?.setRenderEffect(null)
      lastState.fill(Float.NaN)
      effect = null
      invalidate()
      return
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val blurPx = blurRadius * density
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
    val refractionPx = min(refraction * density, side * REFRACTION_RATIO * min(1f, side / reference))
    val highlightPx = min(highlightWidth * density, side * HIGHLIGHT_RATIO).coerceAtLeast(MIN_BAND)
    val angle = Math.toRadians(lightAngle.toDouble())

    var i = 0
    state[i++] = blurPx
    state[i++] = layerWidth
    state[i++] = layerHeight
    shapeBuffer.copyInto(state, i)
    i += shapeBuffer.size
    state[i++] = count.toFloat()
    state[i++] = cornerRadius * density * (if (pressedShape >= 0 && press != 0f) max(shapeScale().first, shapeScale().second) else 1f)
    state[i++] = blend * density
    state[i++] = bezelPx
    state[i++] = refractionPx
    state[i++] = if (refractOutward) 1f else -1f
    state[i++] = (if (refractOutwardY ?: refractOutward) 1f else -1f) * refractionYScale
    state[i++] = falloff
    state[i++] = bumpPeak * density
    state[i++] = bumpShape * density
    state[i++] = bumpInset * density
    state[i++] = bumpSplit
    state[i++] = bumpShapeY * density
    state[i++] = bumpCurve
    state[i++] = dispersion
    state[i++] = magnify
    state[i++] = magnifyY
    state[i++] = saturation
    state[i++] = adaptive
    state[i++] = dim
    state[i++] = cos(angle).toFloat()
    state[i++] = sin(angle).toFloat()
    state[i++] = specular
    state[i++] = highlightPx
    state[i++] = edgeSharp
    state[i++] = edgeSoft
    state[i++] = sharpWidth * density
    state[i++] = softWidth * density
    val shapePress = pressedShape >= 0
    state[i++] = (if (shapePress) shapeLight(glowFollowX, pressedRect.centerX()) else if (interactive) lightOf(glowFollowX, width.toFloat()) else glowX) * density + outPx
    state[i++] = (if (shapePress) shapeLight(glowFollowY, pressedRect.centerY()) else if (interactive) lightOf(glowFollowY, height.toFloat()) else glowY) * density + outPx
    state[i++] = (if (interactive || shapePress) pressGlowSpread else glowSpread) * density
    state[i++] = if (shapePress) (pressShapes?.getOrNull(pressedShape) ?: 0f) * glowLevel else if (interactive) pressGlow * glowLevel else glowStrength
    state[i++] = shadowRadius * density
    state[i++] = shadowOffset * density
    state[i++] = shadowSpread * density
    state[i++] = shadowGap * density
    state[i++] = shadowSoft
    state[i++] = insetSide
    state[i++] = insetSideWidth * density
    state[i++] = insetRamp * density
    state[i++] = pinch * density
    state[i++] = pinchWidth * density
    state[i++] = pinchSpread
    state[i++] = rimPrism
    state[i++] = rimWidth
    state[i++] = if (!rimOutside) 0f else if (rimOptic) 3f else if (rimCrisp) 2f else 1f
    state[i++] = rimSide
    state[i++] = rimFloor
    state[i++] = edgeAxis
    state[i++] = prismAxis
    state[i++] = prismShift * density
    state[i++] = insetShade
    state[i++] = insetOffset * density
    state[i++] = insetBlur * density
    state[i++] = pinchLeft * density
    state[i++] = pinchRight * density
    state[i++] = sampleMaxX * density
    state[i++] = ellipse
    state[i++] = dropletTaper
    state[i++] = dropletTop
    state[i++] = dropletBottom
    state[i++] = continuous
    state[i++] = radiusBottom * density
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
    state[i++] = chroma
    state[i++] = pullBottom * density
    state[i++] = pullBand * density
    state[i++] = pullTop * density
    state[i++] = pullTopBand * density
    state[i++] = rimOut * density
    state[i++] = rimOutBand * density
    state[i++] = rimPull * density
    state[i++] = rimPullBand * density
    state[i++] = frostLeft * density + outPx
    state[i++] = frostTop * density + outPx
    state[i++] = frostRight * density + outPx
    state[i++] = frostBottom * density + outPx
    state[i++] = frost
    state[i++] = frostClear
    state[i++] = frostRadius * density
    state[i++] = frostMagnify
    state[i++] = toneBase
    state[i++] = toneGain
    state[i++] = toneGamma
    state[i++] = toneOn
    state[i++] = frostBase
    state[i++] = frostGain
    state[i++] = frostGamma
    state[i++] = frostChroma
    state[i++] = levelClear
    state[i++] = levelFrostClear
    state[i++] = levelLean
    i = putColor(i, tint)
    i = putColor(i, rim)
    i = putColor(i, shadow)
    i = putColor(i, effectTint)
    state[i++] = tintDarken
    state[i++] = tintMix
    val glowShapeAt = i
    val glowAt = if (shapePress) pressedShape else glowShape
    if (glowAt >= 0) {
      val k = glowAt * 4
      state[i++] = shapeBuffer[k]
      state[i++] = shapeBuffer[k + 1]
      state[i++] = shapeBuffer[k + 2]
      state[i++] = shapeBuffer[k + 3]
    } else {
      state[i++] = 0f
      state[i++] = 0f
      state[i++] = 0f
      state[i++] = 0f
    }
    val sampleClipAt = i
    fillSampleClip(state, i)
    i += 4
    val fadeBlurAt = i
    state[i++] = fadeBlur * density
    state[i++] = fadeFrom * density + outPx
    state[i++] = fadeTo * density + outPx
    val opticAt = i
    state[i++] = rimOpticTop
    state[i++] = rimOpticDarken
    state[i++] = haze
    state[i++] = hazeRadius * density
    state[i++] = toneBow
    state[i++] = frostBow
    state[i++] = if (tonePre && toneOn > 0f) 1f else 0f
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
    glassShader.setFloatUniform("bump", state[u++], state[u++], state[u++], state[u++])
    glassShader.setFloatUniform("bumpY", state[u++])
    glassShader.setFloatUniform("bumpCurve", state[u++])
    glassShader.setFloatUniform("dispersion", state[u++])
    glassShader.setFloatUniform("magnify", state[u++])
    glassShader.setFloatUniform("magnifyY", state[u++])
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
    glassShader.setFloatUniform("shadowGap", state[u++])
    glassShader.setFloatUniform("shadowSoft", state[u++])
    glassShader.setFloatUniform("insetSide", state[u], state[u + 1])
    u += 2
    glassShader.setFloatUniform("insetRamp", state[u++])
    glassShader.setFloatUniform("pinch", state[u++])
    glassShader.setFloatUniform("pinchWidth", state[u++])
    glassShader.setFloatUniform("pinchSpread", state[u++])
    glassShader.setFloatUniform("rimPrism", state[u++])
    glassShader.setFloatUniform("rimWidth", state[u++])
    glassShader.setFloatUniform("rimOutside", state[u++])
    glassShader.setFloatUniform("rimSide", state[u++])
    glassShader.setFloatUniform("rimFloor", state[u++])
    glassShader.setFloatUniform("axis", state[u], state[u + 1], state[u + 2])
    u += 3
    glassShader.setFloatUniform("insetShade", state[u++])
    glassShader.setFloatUniform("insetOffset", state[u++])
    glassShader.setFloatUniform("insetBlur", state[u++])
    glassShader.setFloatUniform("pinchLeft", state[u++])
    glassShader.setFloatUniform("pinchRight", state[u++])
    glassShader.setFloatUniform("sampleMaxX", state[u++])
    glassShader.setFloatUniform("ellipse", state[u++])
    glassShader.setFloatUniform("droplet", state[u], state[u + 1], state[u + 2])
    u += 3
    glassShader.setFloatUniform("continuous", state[u++])
    glassShader.setFloatUniform("radiusBottom", state[u++])
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
    glassShader.setFloatUniform("rimPull", state[u], state[u + 1])
    u += 2
    glassShader.setFloatUniform("frostRect", state[u], state[u + 1], state[u + 2], state[u + 3])
    u += 4
    glassShader.setFloatUniform("frost", state[u++])
    glassShader.setFloatUniform("frostClear", state[u++])
    glassShader.setFloatUniform("frostRadius", state[u++])
    glassShader.setFloatUniform("frostMagnify", state[u++])
    glassShader.setFloatUniform("tone", state[u], state[u + 1], state[u + 2], state[u + 3])
    u += 4
    glassShader.setFloatUniform("frostTone", state[u], state[u + 1], state[u + 2], state[u + 3])
    u += 4
    glassShader.setFloatUniform("level", state[u], state[u + 1], state[u + 2])
    glassShader.setColorUniform("tint", tint)
    glassShader.setColorUniform("rim", rim)
    glassShader.setColorUniform("shadow", shadow)
    glassShader.setColorUniform("colorTint", effectTint)
    glassShader.setFloatUniform("colorTintModel", tintDarken, tintMix)
    glassShader.setFloatUniform("glowShape", state[glowShapeAt], state[glowShapeAt + 1], state[glowShapeAt + 2], state[glowShapeAt + 3])
    glassShader.setFloatUniform("sampleClip", state[sampleClipAt], state[sampleClipAt + 1], state[sampleClipAt + 2], state[sampleClipAt + 3])
    glassShader.setFloatUniform("alphaPass", if (alphaPass) 1f else 0f)
    glassShader.setFloatUniform("fadeBlur", state[fadeBlurAt], state[fadeBlurAt + 1], state[fadeBlurAt + 2])
    glassShader.setFloatUniform("rimOptic", state[opticAt], state[opticAt + 1])
    glassShader.setFloatUniform("toneBow", state[opticAt + 4], state[opticAt + 5])
    val pre = state[opticAt + 6] > 0f
    glassShader.setFloatUniform("tonePre", if (pre) 1f else 0f)

    val glass = RenderEffect.createRuntimeShaderEffect(glassShader, "content")
    val toneStage = toneShader?.takeIf { pre }?.let {
      it.setFloatUniform("curve", toneBase, toneGain, toneBow)
      it.setColorUniform("tint", tint)
      RenderEffect.createRuntimeShaderEffect(it, "content")
    }
    val inner = hazed(blurPx, state[opticAt + 2], state[opticAt + 3], toneStage)
    effect = if (inner != null) RenderEffect.createChainEffect(glass, inner) else glass
    state.copyInto(lastState)
    glassNode?.setRenderEffect(effect)
  }
}
