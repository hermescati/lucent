package expo.modules.lucent

import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.RectF
import android.graphics.RenderNode
import android.os.Build
import android.view.View
import expo.modules.kotlin.AppContext

/** Finds the backdrop the glass lifts into and draws what sits behind the glass. */
abstract class GlassBackdrops(context: Context, appContext: AppContext) : GlassPress(context, appContext) {
  protected var host: GlassBackdropView? = null

  internal val clipNode: RenderNode? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) RenderNode("LucentGlassClip") else null

  internal val hostBounds = RectF()
  internal var flat = true

  private val selfToGlobal = Matrix()
  private val backdropToGlobal = Matrix()
  private val backdropToSelf = Matrix()
  private val inverse = Matrix()

  override fun updateHost() {
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

  protected val lifted: Boolean
    get() = host != null

  protected fun prepareBackdrop(): Boolean {
    selfToGlobal.reset()
    transformMatrixToGlobal(selfToGlobal)
    applyPress(selfToGlobal)
    return selfToGlobal.invert(inverse)
  }

  protected fun drawBackdrops(canvas: Canvas) {
    // A screen on its way out can still be drawn after it's detached. Its glass has lost its host by then, and the
    // backdrop it would fall back to may still hold the glass's own drawing: a cycle that overflows the render thread.
    if (!isAttachedToWindow) return
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

  private fun drawBackdrop(canvas: Canvas, name: String) {
    val backdrop = GlassRegistry.backdrop(name) ?: return
    val node = backdrop.visibleNode ?: return
    // A backdrop records only when it's redrawn, and an offscreen one isn't while its content holds still, so a
    // recording dropped meanwhile (as while glass drew without the shader) would leave this glass seeing nothing.
    if (!node.hasDisplayList()) {
      backdrop.invalidate()
      return
    }
    backdropToGlobal.reset()
    backdrop.transformMatrixToGlobal(backdropToGlobal)
    backdropToSelf.set(inverse)
    backdropToSelf.preConcat(backdropToGlobal)
    canvas.save()
    canvas.concat(backdropToSelf)
    canvas.drawRenderNode(node)
    canvas.restore()
  }

  /** Records this glass into its host backdrop's display list (GlassView). */
  internal abstract fun recordLifted(owner: GlassBackdropView, hostInverse: Matrix)
}
