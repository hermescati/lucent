package expo.modules.lucent

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class GlassBlurView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext) {
  private val density = resources.displayMetrics.density
  private var effect: RenderEffect? = null

  init {
    clipChildren = false
    clipToPadding = false
  }

  var radius = 0f
    set(value) {
      if (value == field) return
      field = value
      apply()
    }

  @SuppressLint("NewApi")
  private fun apply() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val px = radius * density
    effect = if (px > 0.5f) RenderEffect.createBlurEffect(px, px, Shader.TileMode.DECAL) else null
    super.setRenderEffect(effect)
  }

  // React Native sizes its children: measuring them here, as a LinearLayout does, would give a text input its text's
  // height rather than its own, and it'd draw its text at the top.
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) = Unit

  @SuppressLint("MissingSuperCall")
  override fun requestLayout() = Unit

  @SuppressLint("NewApi")
  override fun setRenderEffect(renderEffect: RenderEffect?) {
    super.setRenderEffect(effect)
  }
}
