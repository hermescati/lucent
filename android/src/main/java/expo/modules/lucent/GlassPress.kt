package expo.modules.lucent

import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.RectF
import android.os.SystemClock
import android.view.MotionEvent
import android.view.View
import expo.modules.kotlin.AppContext
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.max

/** Touch and press: the press spring, the lean and stretch, the light that follows the finger, and pressed shapes. */
abstract class GlassPress(context: Context, appContext: AppContext) : GlassProps(context, appContext) {
  protected var press = 0f
  /** Drawn solid, a press only shades the glass (GlassPlain): no growing, leaning or stretching toward the finger. */
  protected abstract val pressesSolid: Boolean
  private var pressVelocity = 0f
  private var pressTarget = 0f
  protected var glowLevel = 0f
  private var touchX = 0f
  private var touchY = 0f
  protected var glowFollowX = 0f
  protected var glowFollowY = 0f
  private var lastFrame = 0L
  protected var pressedShape = -1
  private var pressedChild: View? = null
  protected val pressedRect = RectF()

  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    val handled = super.dispatchTouchEvent(event)
    // A press ends with its touch whatever the glass is doing by then: its shapes can change under the finger, and a
    // lift it let pass would leave the press on for good.
    val action = event.actionMasked
    if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
      if (pressTarget != 0f) {
        pressTarget = 0f
        invalidate()
      }
      return handled
    }
    if (!interactive && !pressesShapes) return handled
    when (action) {
      MotionEvent.ACTION_DOWN -> {
        if (pressesShapes && !pickShape(event.x / density, event.y / density)) {
          // Off every shape: whatever an earlier press left settles back.
          pressTarget = 0f
          invalidate()
          return handled
        }
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
    }
    return handled || pressTarget > 0f
  }

  // react-native-gesture-handler, taking a touch over for one of its gestures, cancels the views it started on through
  // here rather than dispatchTouchEvent, and keeps the rest of the touch, the lift too: the press ends then.
  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (event.actionMasked == MotionEvent.ACTION_CANCEL) {
      if (pressTarget != 0f) {
        pressTarget = 0f
        invalidate()
      }
    }
    return super.onTouchEvent(event)
  }

  protected fun stepPress() {
    val now = SystemClock.uptimeMillis()
    val elapsed = if (lastFrame == 0L) 0f else (now - lastFrame) / 1000f
    lastFrame = now
    if (elapsed <= 0f) return
    // The pressed shape where it is now, not where it was when pressed: a press can start it moving or melting away, as a
    // close button's does, and its glow goes with it rather than staying behind at its old size.
    val source = shapes
    if (pressedShape >= 0 && source != null && pressedShape * 4 + 3 < source.size) {
      val k = pressedShape * 4
      pressedRect.set(source[k], source[k + 1], source[k + 2], source[k + 3])
    }
    val dt = if (elapsed > IDLE_GAP) FRAME_STEP else elapsed.coerceAtMost(MAX_STEP)
    val pressing = pressTarget > 0.5f
    val omega = if (pressing) PRESS_IN_OMEGA else PRESS_OUT_OMEGA
    val damping = if (pressing) PRESS_IN_DAMPING else PRESS_OUT_DAMPING
    val steps = kotlin.math.ceil(dt / SUB_STEP).toInt().coerceAtLeast(1)
    val h = dt / steps
    repeat(steps) {
      val pull = omega * omega * (pressTarget - press) - 2f * damping * omega * pressVelocity
      pressVelocity += pull * h
      press += pressVelocity * h
    }
    if (kotlin.math.abs(press - pressTarget) < 1e-3f && kotlin.math.abs(pressVelocity) < 1e-2f) {
      press = pressTarget
      pressVelocity = 0f
    }
    val glowTarget = if (!pressing) 0f else 1f - (1f - GLOW_OUTSIDE) * (touchOutside / OUTSIDE_REACH).coerceIn(0f, 1f)
    val glowTime = if (glowTarget > glowLevel) GLOW_RISE else if (pressing) GLOW_DIM else GLOW_FALL
    glowLevel += (glowTarget - glowLevel) * (1f - exp(-dt / glowTime))
    if (kotlin.math.abs(glowLevel - glowTarget) < 1e-3f) glowLevel = glowTarget
    val follow = 1f - exp(-dt / FOLLOW_TIME)
    glowFollowX += (touchX - glowFollowX) * follow
    glowFollowY += (touchY - glowFollowY) * follow
    if (pressesShapes) pressShapeChild()
    if (interactive || pressesShapes) updateEffect()
  }

  /** Nothing pressing it and nothing left of a press to settle: the glass needn't draw again for it. */
  protected val pressResting: Boolean
    get() = pressTarget == 0f && press == 0f && pressVelocity == 0f && glowLevel == 0f

  protected val pressesShapes: Boolean
    get() = pressShapes?.any { it > 0f } == true && (shapes?.size ?: 0) >= 4

  private fun pickShape(x: Float, y: Float): Boolean {
    val source = shapes ?: return false
    val flags = pressShapes ?: return false
    for (k in 0 until minOf(source.size / 4, flags.size, MAX_SHAPES)) {
      if (flags[k] <= 0f) continue
      if (x >= source[k * 4] && x <= source[k * 4 + 2] && y >= source[k * 4 + 1] && y <= source[k * 4 + 3]) {
        if (k != pressedShape) {
          pressedChild?.let { resetChild(it) }
          press = 0f
          pressVelocity = 0f
          glowLevel = 0f
        }
        pressedShape = k
        pressedRect.set(source[k * 4], source[k * 4 + 1], source[k * 4 + 2], source[k * 4 + 3])
        val child = childAt(pressedRect)
        // The same shape can be a different view by now: the one it was is let go, not left grown.
        if (child !== pressedChild) pressedChild?.let { resetChild(it) }
        pressedChild = child
        return true
      }
    }
    return false
  }

  private fun childAt(rect: RectF): View? {
    for (c in 0 until childCount) {
      val child = getChildAt(c)
      if (kotlin.math.abs(child.left / density - rect.left) < 1f && kotlin.math.abs(child.top / density - rect.top) < 1f) return child
    }
    return null
  }

  private fun resetChild(child: View) {
    child.scaleX = 1f
    child.scaleY = 1f
    child.translationX = 0f
    child.translationY = 0f
  }

  private fun pressShapeChild() {
    val child = pressedChild ?: return
    val (sx, sy) = shapeScale()
    val (stretchX, stretchY) = shapePullScale()
    child.scaleX = sx * stretchX
    child.scaleY = sy * stretchY
    child.translationX = (shapeLeanX * PRESS_LEAN + shapePullX * PULL_SHIFT) * density
    child.translationY = (shapeLeanY * PRESS_LEAN + shapePullY * PULL_SHIFT) * density
    if (press == 0f && pressTarget == 0f) {
      resetChild(child)
      pressedChild = null
      pressedShape = -1
    }
  }

  protected fun shapeScale(): Pair<Float, Float> {
    if (pressesSolid) return Pair(1f, 1f)
    val side = max(pressedRect.width(), pressedRect.height())
    val scale = if (side > 0f) 1f + pressGrow / side * press else 1f
    val lx = kotlin.math.abs(shapeLeanX)
    val ly = kotlin.math.abs(shapeLeanY)
    return Pair(scale * (1f + PRESS_STRETCH * lx - PRESS_STRETCH * ly), scale * (1f + PRESS_STRETCH * ly - PRESS_STRETCH * lx))
  }

  // How much a finger dragged off the pressed shape stretches it, across and down. What's on it stretches with it, as
  // iOS 27's icons and badges do; kept its size, it poked out of the narrowed glass and was cut off.
  protected fun shapePullScale(): Pair<Float, Float> {
    val px = kotlin.math.abs(shapePullX)
    val py = kotlin.math.abs(shapePullY)
    return Pair(1f + PULL_STRETCH * (px - py), 1f + PULL_STRETCH * (py - px))
  }

  // How far the finger is past the pressed glass along one axis, signed, in points, eased in and out with the press.
  private fun pullOf(follow: Float, low: Float, high: Float): Float {
    val past = if (follow < low) follow - low else if (follow > high) follow - high else 0f
    return past.coerceIn(-PULL_REACH, PULL_REACH) * press
  }

  protected val shapePullX: Float
    get() = if (pressedShape < 0 || pressesSolid) 0f else pullOf(glowFollowX, pressedRect.left, pressedRect.right)

  protected val shapePullY: Float
    get() = if (pressedShape < 0 || pressesSolid) 0f else pullOf(glowFollowY, pressedRect.top, pressedRect.bottom)

  private val pullX: Float
    get() = if (pressGrow > 0f && !pressesShapes && !pressesSolid) pullOf(glowFollowX, 0f, width / density) else 0f

  private val pullY: Float
    get() = if (pressGrow > 0f && !pressesShapes && !pressesSolid) pullOf(glowFollowY, 0f, height / density) else 0f

  private val shapeHalf: Float
    get() = max(pressedRect.width(), pressedRect.height()) * 0.5f

  protected val shapeLeanX: Float
    get() = if (pressedShape < 0 || pressesSolid) 0f else leanOf(glowFollowX - pressedRect.centerX(), shapeHalf)

  protected val shapeLeanY: Float
    get() = if (pressedShape < 0 || pressesSolid) 0f else leanOf(glowFollowY - pressedRect.centerY(), shapeHalf)

  protected fun shapeLight(follow: Float, center: Float): Float {
    val half = shapeHalf
    return if (half <= 0f) center else center + half * kotlin.math.tanh((follow - center) / half) * LIGHT_FOLLOW
  }

  // Along a capsule holding several buttons, the light is on the one pressed, as iOS 27's is, not near the middle, which
  // lit the whole capsule: it follows the finger, kept a corner's radius from the ends.
  protected fun shapeLightX(follow: Float): Float {
    val rect = pressedRect
    val radius = rect.height() * 0.5f
    if (rect.width() < rect.height() * WIDE_SHAPE) return shapeLight(follow, rect.centerX())
    return follow.coerceIn(rect.left + radius, rect.right - radius)
  }

  private val currentScale: Float
    get() {
      if (pressesShapes || pressesSolid) return 1f
      val side = max(width, height) / density
      val target = if (pressGrow > 0f && side > 0f) 1f + pressGrow / side else pressScale
      return 1f + (target - 1f) * press
    }

  private val touchOutside: Float
    get() {
      val l = if (pressedShape >= 0) pressedRect.left else 0f
      val t = if (pressedShape >= 0) pressedRect.top else 0f
      val w = if (pressedShape >= 0) pressedRect.right else width / density
      val h = if (pressedShape >= 0) pressedRect.bottom else height / density
      val dx = max(max(l - touchX, touchX - w), 0f)
      val dy = max(max(t - touchY, touchY - h), 0f)
      return kotlin.math.sqrt(dx * dx + dy * dy)
    }

  protected fun lightOf(follow: Float, extent: Float): Float {
    val half = max(width, height) * 0.5f / density
    val center = extent * 0.5f / density
    return if (half <= 0f) center else center + half * kotlin.math.tanh((follow - center) / half) * LIGHT_FOLLOW
  }

  private fun leanOf(offset: Float, half: Float): Float =
    if (half <= 0f) 0f else kotlin.math.tanh(offset / half) * press

  private val leanX: Float
    get() = if (pressGrow > 0f && !pressesShapes && !pressesSolid) leanOf(glowFollowX - width * 0.5f / density, max(width, height) * 0.5f / density) else 0f

  private val leanY: Float
    get() = if (pressGrow > 0f && !pressesShapes && !pressesSolid) leanOf(glowFollowY - height * 0.5f / density, max(width, height) * 0.5f / density) else 0f

  protected fun applyPress(canvas: Canvas) {
    val scale = currentScale
    val lx = leanX
    val ly = leanY
    val px = pullX
    val py = pullY
    if (lx != 0f || ly != 0f || px != 0f || py != 0f) {
      canvas.translate((lx * PRESS_LEAN + px * PULL_SHIFT) * density, (ly * PRESS_LEAN + py * PULL_SHIFT) * density)
    }
    if (scale != 1f || lx != 0f || ly != 0f || px != 0f || py != 0f) {
      val pull = PULL_STRETCH * (kotlin.math.abs(px) - kotlin.math.abs(py))
      canvas.scale(
        scale * (1f + PRESS_STRETCH * kotlin.math.abs(lx) - PRESS_STRETCH * kotlin.math.abs(ly)) * (1f + pull),
        scale * (1f + PRESS_STRETCH * kotlin.math.abs(ly) - PRESS_STRETCH * kotlin.math.abs(lx)) * (1f - pull),
        width * 0.5f,
        height * 0.5f,
      )
    }
  }

  protected fun applyPress(matrix: Matrix) {
    val scale = currentScale
    val lx = leanX
    val ly = leanY
    val px = pullX
    val py = pullY
    if (lx != 0f || ly != 0f || px != 0f || py != 0f) {
      matrix.preTranslate((lx * PRESS_LEAN + px * PULL_SHIFT) * density, (ly * PRESS_LEAN + py * PULL_SHIFT) * density)
    }
    if (scale != 1f || lx != 0f || ly != 0f || px != 0f || py != 0f) {
      val pull = PULL_STRETCH * (kotlin.math.abs(px) - kotlin.math.abs(py))
      matrix.preScale(
        scale * (1f + PRESS_STRETCH * kotlin.math.abs(lx) - PRESS_STRETCH * kotlin.math.abs(ly)) * (1f + pull),
        scale * (1f + PRESS_STRETCH * kotlin.math.abs(ly) - PRESS_STRETCH * kotlin.math.abs(lx)) * (1f - pull),
        width * 0.5f,
        height * 0.5f,
      )
    }
  }
}
