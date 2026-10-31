package expo.modules.lucent

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.RenderNode
import android.graphics.Shader
import android.os.Build
import expo.modules.kotlin.AppContext
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/** The fallback without the shader (low-RAM devices, older Android, plain glass): paths, blur, fill, edges and rim. */
abstract class GlassPlain(context: Context, appContext: AppContext) : GlassEffect(context, appContext) {
  private val wallRadii = FloatArray(8)

  private val plainNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassPlain") else null

  private var plainBlur = -1f
  private val plainPath = Path()
  private val shapePath = Path()
  private val clipPath = Path()
  private val shapeRect = RectF()
  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
  private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)

  private fun addContinuous(path: Path, rect: RectF, corner: Float) {
    val wide = rect.width() >= rect.height()
    val long = max(rect.width(), rect.height()) * 0.5f
    val short = min(rect.width(), rect.height()) * 0.5f
    val r = if (corner > 0f) min(short, corner) else short
    val reach = min(r * 1.528f, long)
    val t = ((reach / r - 1f) / 0.51f).coerceIn(0f, 1f)
    val eLong = 2f + 1.35f * t
    val eShort = 2f
    for (step in 0 until CONTINUOUS_STEPS) {
      val angle = step * 2.0 * Math.PI / CONTINUOUS_STEPS
      val c = cos(angle).toFloat()
      val s = sin(angle).toFloat()
      val sc = if (c >= 0f) 1f else -1f
      val ss = if (s >= 0f) 1f else -1f
      val l = sc * (long - reach + reach * Math.pow(abs(c).toDouble(), 2.0 / eLong).toFloat())
      val h = ss * (short - r + r * Math.pow(abs(s).toDouble(), 2.0 / eShort).toFloat())
      val x = rect.centerX() + if (wide) l else h
      val y = rect.centerY() + if (wide) h else l
      if (step == 0) path.moveTo(x, y) else path.lineTo(x, y)
    }
    path.close()
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

  protected fun drawPlain(canvas: Canvas) {
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
}
