package expo.modules.lucent

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.os.Build
import expo.modules.kotlin.AppContext
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * Solid glass, for every device without the shader (older Android, low RAM, plain glass, or the override): the shape
 * filled opaque with the component's fallback colour, as One UI's bars are, with its shadow and the tab bar's pill.
 */

abstract class GlassPlain(context: Context, appContext: AppContext) : GlassEffect(context, appContext) {
  private val wallRadii = FloatArray(8)

  private val plainPath = Path()
  private val shapePath = Path()
  private val clipPath = Path()
  private val shapeRect = RectF()
  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
  private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val frostPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val shadePaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val shadeRect = RectF()
  private val frostPath = Path()

  // Android 7 and 8 draw no shadow layer on a shape with hardware acceleration (only on text, before Android 9), so
  // there the shadow is blurred in software into a small bitmap, at a quarter of the size, and redrawn only when the
  // shape changes.
  private var plainCount = 0
  private var softShadow: Bitmap? = null
  private val softBounds = RectF()
  private val softKey = FloatArray(SOFT_KEY_HEAD + MAX_SHAPES * 4)
  private val softNext = FloatArray(SOFT_KEY_HEAD + MAX_SHAPES * 4)
  private val softBlur = Paint(Paint.ANTI_ALIAS_FLAG)
  private val softDraw = Paint(Paint.FILTER_BITMAP_FLAG)
  private val frostRect = RectF()

  // Apple's continuous corner, traced from the same fit the glass shader uses (see appleRadius there): each corner's
  // outline at its distance from the corner's centre, R(alpha), over the wedge where it curves; straight between.
  private fun addContinuous(path: Path, rect: RectF, corner: Float) {
    val ex = rect.width() * 0.5f
    val ey = rect.height() * 0.5f
    val r = if (corner > 0f) min(min(ex, ey), corner) else min(ex, ey)
    // A square with a full radius stays a circle, as iOS's are.
    if (abs(ex - ey) < 0.1f * r) {
      path.addRoundRect(rect, r, r, Path.Direction.CW)
      return
    }
    val steps = CONTINUOUS_STEPS / 4
    var first = true
    for (quadrant in 0 until 4) {
      val sx = if (quadrant == 0 || quadrant == 3) 1f else -1f
      val sy = if (quadrant < 2) 1f else -1f
      for (step in 0..steps) {
        // Around each corner in drawing order, from one edge's start of the curve to the other's.
        val t = step.toFloat() / steps
        val u = if (sx * sy > 0f) -1f + 2f * t else 1f - 2f * t
        val alpha = APPLE_MID + u * APPLE_SPREAD
        val radial = r * appleRadius(u * u)
        val vx = ex - r + radial * cos(alpha)
        val vy = ey - r + radial * sin(alpha)
        // A capsule's ends are cut at mid-height, as iOS's are.
        val x = rect.centerX() + sx * max(vx, 0f)
        val y = rect.centerY() + sy * max(vy, 0f)
        if (first) path.moveTo(x, y) else path.lineTo(x, y)
        first = false
      }
    }
    path.close()
  }

  private fun appleRadius(s: Float): Float =
    1.0017855f + s * (-0.0287977f + s * (-0.6672829f + s * (3.2177690f + s * (-5.2756717f + s * (4.1355015f + s * -1.2528373f)))))

  /** The tab bar's pill, which the shader draws as a toned patch of the glass (its frost): here a flat tone of the fill. */
  private fun drawPlainFrost(canvas: Canvas, base: Color) {
    if (frost <= 0f) return
    frostRect.set(
      frostLeft * density + outPx,
      frostTop * density + outPx,
      frostRight * density + outPx,
      frostBottom * density + outPx,
    )
    if (frostRect.width() <= 0f || frostRect.height() <= 0f) return
    frostPath.reset()
    addContinuous(frostPath, frostRect, min(frostRect.width(), frostRect.height()) * 0.5f)
    val amount = frost.coerceIn(0f, 1f)
    frostPaint.color = if (fallbackPill.alpha() > 0f) {
      Color.argb(amount * fallbackPill.alpha(), fallbackPill.red(), fallbackPill.green(), fallbackPill.blue())
    } else {
      val tone = { c: Float -> (frostBase + frostGain * c).coerceIn(0f, 1f) }
      Color.argb(amount, tone(base.red()), tone(base.green()), tone(base.blue()))
    }
    canvas.save()
    canvas.clipPath(plainPath)
    canvas.drawPath(frostPath, frostPaint)
    canvas.restore()
  }

  private fun buildPlainPath(): Boolean {
    val count = fillShapes()
    plainCount = count
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
      } else if (continuous >= 0.5f) {
        addContinuous(shapePath, shapeRect, corner)
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

  // Pressed, solid glass shades as One UI's surfaces do: lighter over a dark fill, darker over a light one.
  private fun drawPressShade(canvas: Canvas, fill: Color) {
    if (press <= 0f || !(interactive || pressedShape >= 0)) return
    val light = fill.luminance() > 0.5f
    val amount = (press.coerceIn(0f, 1f) * if (light) PRESS_SHADE_LIGHT else PRESS_SHADE_DARK)
    shadePaint.color = if (light) Color.argb(amount, 0f, 0f, 0f) else Color.argb(amount, 1f, 1f, 1f)
    canvas.save()
    if (pressedShape >= 0) {
      shadeRect.set(
        pressedRect.left * density + outPx,
        pressedRect.top * density + outPx,
        pressedRect.right * density + outPx,
        pressedRect.bottom * density + outPx,
      )
      canvas.clipRect(shadeRect)
    }
    canvas.drawPath(plainPath, shadePaint)
    canvas.restore()
  }

  private fun drawSoftShadow(canvas: Canvas, color: Color, radius: Float, offset: Float) {
    plainPath.computeBounds(softBounds, true)
    // The blur reaches about its radius past the shape; its offset moves it down.
    val reach = radius * SOFT_REACH
    softBounds.set(softBounds.left - reach, softBounds.top - reach + offset, softBounds.right + reach, softBounds.bottom + reach + offset)
    val w = ceil(softBounds.width() * SOFT_SCALE).toInt().coerceAtLeast(1)
    val h = ceil(softBounds.height() * SOFT_SCALE).toInt().coerceAtLeast(1)

    // What the shape's built from (helpers above): the same values draw the same shadow.
    var n = 0
    val argb = color.toArgb()
    softNext[n++] = (argb ushr 16).toFloat()
    softNext[n++] = (argb and 0xFFFF).toFloat()
    softNext[n++] = radius
    softNext[n++] = offset
    softNext[n++] = cornerRadius
    softNext[n++] = ellipse
    softNext[n++] = continuous
    softNext[n++] = wallSide
    softNext[n++] = wallRound
    softNext[n++] = wallLead
    softNext[n++] = if (clipOn >= 0.5f) clipLeft + clipTop * 3f + clipRight * 7f + clipBottom * 11f + clipScaleX + clipScaleY * 5f else 0f
    softNext[n++] = plainCount.toFloat()
    for (i in 0 until minOf(plainCount, MAX_SHAPES) * 4) softNext[n++] = shapeBuffer[i]
    val bitmap = softShadow
    val same = bitmap != null && bitmap.width == w && bitmap.height == h &&
      (0 until n).all { abs(softKey[it] - softNext[it]) < SOFT_KEY_SLOP }
    if (!same) {
      val target = if (bitmap != null && bitmap.width == w && bitmap.height == h) bitmap else {
        bitmap?.recycle()
        Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).also { softShadow = it }
      }
      target.eraseColor(android.graphics.Color.TRANSPARENT)
      val soft = Canvas(target)
      soft.scale(SOFT_SCALE, SOFT_SCALE)
      soft.translate(-softBounds.left, -softBounds.top + offset)
      softBlur.color = color.toArgb()
      softBlur.maskFilter = BlurMaskFilter(radius, BlurMaskFilter.Blur.NORMAL)
      soft.drawPath(plainPath, softBlur)
      System.arraycopy(softNext, 0, softKey, 0, n)
    }
    val shadow = softShadow ?: return
    canvas.save()
    canvas.clipOutPath(plainPath)
    canvas.drawBitmap(shadow, null, softBounds, softDraw)
    canvas.restore()
  }

  protected fun drawPlain(canvas: Canvas) {
    if (width <= 0 || height <= 0 || !buildPlainPath()) return
    // A pass of what's behind it only (the tab bar's lens over its icons): drawn sharp within the shape, without the
    // fill, which would cover what it's there to show.
    if (alphaPass) {
      if (prepareBackdrop()) {
        canvas.save()
        canvas.clipPath(plainPath)
        canvas.translate(outPx, outPx)
        drawBackdrops(canvas)
        canvas.restore()
      }
      return
    }
    // Opaque: a tinted glass's own tint (a prominent button), else the component's fallback surface, else its tint,
    // each with the see-through taken out.
    val fill = if (effectTint.alpha() > 0f) effectTint else if (fallback.alpha() > 0f) fallback else activeTint
    val solid = Color.valueOf(fill.red(), fill.green(), fill.blue(), 1f)

    // Its own solid shadow if it has one, else the glass's.
    val ownShadow = fallbackShadow.alpha() > 0f
    val dropColor = if (ownShadow) fallbackShadow else shadow
    val dropRadius = if (ownShadow) fallbackShadowRadius else shadowRadius
    val dropOffset = if (ownShadow) fallbackShadowOffset else shadowOffset
    if (dropColor.alpha() > 0f && dropRadius > 0f && (Build.VERSION.SDK_INT < Build.VERSION_CODES.P || SOFT_SHADOW_TEST)) {
      drawSoftShadow(canvas, dropColor, dropRadius * density, dropOffset * density)
    } else if (dropColor.alpha() > 0f && dropRadius > 0f) {
      canvas.save()
      canvas.clipOutPath(plainPath)
      shadowPaint.color = Color.BLACK
      shadowPaint.setShadowLayer(dropRadius * density, 0f, dropOffset * density, dropColor.toArgb())
      canvas.drawPath(plainPath, shadowPaint)
      canvas.restore()
    }

    fillPaint.color = solid.toArgb()
    canvas.drawPath(plainPath, fillPaint)
    drawPlainFrost(canvas, solid)

    drawPressShade(canvas, solid)

    // No glass outline drawn solid, as One UI's bar has none: only a solid rim of its own.
    if (fallbackRim.alpha() > 0f && fallbackRimWidth > 0f) {
      canvas.save()
      canvas.clipPath(plainPath)
      // Inside the shape: the clip keeps half the stroke.
      strokePaint.strokeWidth = fallbackRimWidth * density * 2f
      strokePaint.color = fallbackRim.toArgb()
      canvas.drawPath(plainPath, strokePaint)
      canvas.restore()
    }
  }
}
