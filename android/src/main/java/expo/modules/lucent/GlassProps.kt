package expo.modules.lucent

import android.content.Context
import android.graphics.Color
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ReactPointerEventsView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/** The props JS sets on a glass view, and the sizes derived from them. */
abstract class GlassProps(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), ReactPointerEventsView {
  // React's pointerEvents, which only its own views read on their own: glass drawn as a part of a bigger control, its
  // stretch padding reaching past it, passes "none" so that padding doesn't take the touches of what's beside it.
  override var pointerEvents: PointerEvents = PointerEvents.AUTO
  var group: String = GlassRegistry.DEFAULT_GROUP
  var underlay: String? = null
  var overlay: String? = null
  var shapes: FloatArray? = null
  // One of `shapes` stretched as a whole about its middle, toward a finger dragged off it: its index, then how much
  // across and down; the shape stays at its unstretched size in `shapes`.
  var shapePull: FloatArray? = null
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
  var bumpPeak = 0f
  var bumpShape = 1f
  var bumpInset = 0f
  var bumpSplit = 1f
  var bumpShapeY = 0f
  var bumpCurve = 0f
  var dispersion = 0f
  var magnify = 0f
  var magnifyY = -999f
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
  // Which of `shapes` the glow stays inside, or -1 for the first (the whole view with one shape).
  var glowShape = -1
  var shadowRadius = 0f
  var shadowOffset = 0f
  var shadowSpread = 0f
  var shadowGap = 0f
  var shadowSoft = 0f
  var insetSide = 0f
  var insetSideWidth = 1f
  var insetRamp = 0f
  var pinch = 0f
  var pinchWidth = 0f
  var pinchSpread = 0f
  var rimPrism = 0f
  var rimWidth = 2f
  var rimOutside = false
  var rimCrisp = false
  var rimSide = 1f
  var rimFloor = 0f
  // The outline as iOS 27 draws it: the backdrop under it darkened, not a stroke. Its strength where the edge faces up or
  // down (1 at the sides), and how much it eases off over light backdrops (dark mode).
  var rimOptic = false
  var rimOpticTop = 0f
  var rimOpticDarken = 0f
  // A very wide blur under the near-sharp image, at this weight and radius: iOS 27's glass is mostly haze.
  var haze = 0f
  var hazeRadius = 0f
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
  var dropletTaper = 0f
  var dropletTop = 0f
  var dropletBottom = 0f
  var continuous = 0f
  var radiusBottom = 0f
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
  var rimPull = 0f
  var rimPullBand = 1f
  var wideRadius = 0f
  var wideMix = 0f
  var frost = 0f
  var frostClear = 0f
  var frostRadius = 0f
  var frostMagnify = 0f
  var fadeBlur = 0f
  var fadeFrom = 0f
  var fadeTo = 0f
  var toneBase = 0f
  var toneGain = 1f
  var toneGamma = 1f
  var toneOn = 0f
  var frostBase = 0f
  var frostGain = 1f
  var frostGamma = 1f
  var frostChroma = 1f
  // iOS 27's Liquid Glass setting (Clear to Tinted), past the tone: Clear lets this much of the backdrop back through,
  // on the glass and under the frost; Tinted leans the glass toward its own result over white (+) or black (−).
  var levelClear = 0f
  var levelFrostClear = 0f
  var levelLean = 0f
  // A bow on the tone curve, gain·x(1−x) on top of base + gain·x^gamma: iOS 27's dark glass lifts dark backdrops less
  // than a power curve can. For the glass, and under the frost (the tab bar's pill).
  var toneBow = 0f
  var frostBow = 0f
  // Tone the backdrop before the haze's blur rather than after, as iOS 27's dark glass does: detail averages darker
  // than its mean would tone. The tone curve's gamma must be 1 (the frost and the outline invert it).
  var tonePre = false
  var sampleBackdrop = false
    set(value) {
      field = value
      scheduleSample()
    }

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
  var clipContent = false
  var aboveTone = false
  var tint: Color = TRANSPARENT
  var rim: Color = TRANSPARENT
  var fallback: Color = TRANSPARENT
  var shadow: Color = TRANSPARENT
  // Drawn solid (GlassPlain), the glass takes these instead of its rim and shadow: One UI 9's paint, no edge and a soft
  // drop shadow. The pill is the solid frost's colour; without one the frost is a tone of the fill.
  var fallbackPill: Color = TRANSPARENT
  var fallbackRim: Color = TRANSPARENT
  var fallbackRimWidth = 0f
  // Drawn solid, how many points at its bottom it fades out over, to clear.
  var fallbackFade = 0f
  var fallbackShadow: Color = TRANSPARENT
  var fallbackShadowRadius = 0f
  var fallbackShadowOffset = 0f
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
  var tintDarken = 0f
  var tintMix = 0f
  var interactive = false
  var pressScale = 1f
  var pressGrow = 0f
  var pressGlow = 0f
  var pressGlowSpread = 0f
  var pressShapes: FloatArray? = null

  protected val density = resources.displayMetrics.density

  protected val outPx: Float
    get() = outset * density

  protected val layerWidth: Float
    get() = width + outPx * 2f

  protected val layerHeight: Float
    get() = height + outPx * 2f

  protected val activeTint: Color
    get() =
      if (effectTint.alpha() > 0f) {
        Color.valueOf(effectTint.red(), effectTint.green(), effectTint.blue(), effectTint.alpha() * TINT_STRENGTH)
      } else {
        tint
      }

  /** Re-finds the backdrop this glass lifts into (GlassBackdrops). */
  protected abstract fun updateHost()

  /** Starts or stops sampling the backdrop brightness (GlassView). */
  protected abstract fun scheduleSample()

  /** Rebuilds the glass effect from the current props (GlassEffect). */
  abstract fun updateEffect()
}
