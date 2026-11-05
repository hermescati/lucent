package expo.modules.lucent

import android.graphics.Color
import android.os.Build
import android.view.RoundedCorner
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LucentModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Lucent")

    // The screen's corner radius in dp, which a screen swiped back rounds its corners to, as iOS does; 0 before Android
    // 12, or on a square screen.
    Function("displayCornerRadius") {
      val activity = appContext.currentActivity ?: return@Function 0.0
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function 0.0
      val corner = activity.window?.decorView?.rootWindowInsets?.getRoundedCorner(RoundedCorner.POSITION_TOP_LEFT)
      (corner?.radius ?: 0) / activity.resources.displayMetrics.density.toDouble()
    }

    // How far down the screen a camera cutout in the top's middle reaches, in dp: a punch hole or notch the bar has to
    // clear. 0 without one, with one in a corner, or before Android 9.
    Function("topCutoutBottom") {
      val activity = appContext.currentActivity ?: return@Function 0.0
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return@Function 0.0
      val cutout = activity.window?.decorView?.rootWindowInsets?.displayCutout ?: return@Function 0.0
      val width = activity.window.decorView.width.takeIf { it > 0 } ?: activity.resources.displayMetrics.widthPixels
      val bottom = cutout.boundingRects
        .filter { it.top <= 0 && it.centerX() > width / 4 && it.centerX() < width * 3 / 4 }
        .maxOfOrNull { it.bottom } ?: 0
      bottom / activity.resources.displayMetrics.density.toDouble()
    }

    // Draws an older Android's glass on this device (0: its own; 1: Android 12's, blur without refraction; 2: Android
    // 11's and below, no blur), so the fallbacks can be seen on a newer phone.
    Function("setGlassFallback") { level: Int ->
      android.os.Handler(android.os.Looper.getMainLooper()).post { GlassSupport.setFallback(level) }
    }

    Function("renderVectorIcon") { key: String, viewBox: List<Double>, layers: List<VectorLayer>, size: Double, scale: Double ->
      val cacheDirectory = appContext.cacheDirectory
      VectorIconRenderer.render(cacheDirectory, key, viewBox, layers, size, scale)
    }

    View(GlassBackdropView::class) {
      Name("LucentGlassBackdropView")

      Prop("group") { view: GlassBackdropView, group: String? ->
        view.group = group ?: GlassRegistry.DEFAULT_GROUP
      }

      Prop("offscreen") { view: GlassBackdropView, value: Boolean? -> view.offscreen = value ?: false }
      Prop("saturation") { view: GlassBackdropView, value: Float? -> view.saturation = value ?: 1f }
      Prop("brightness") { view: GlassBackdropView, value: Float? -> view.brightness = value ?: 1f }
    }

    View(PredictiveBackView::class) {
      Name("LucentPredictiveBackView")
      Events("onBack")

      Prop("enabled") { view: PredictiveBackView, value: Boolean? -> view.takesBack = value ?: false }
    }

    View(ScreenEnterView::class) {
      Name("LucentScreenEnterView")
      Events("onEnter")

      Prop("armed") { view: ScreenEnterView, value: Boolean? -> view.armed = value ?: false }
    }

    View(GlassBlurView::class) {
      Name("LucentGlassBlurView")

      Prop("radius") { view: GlassBlurView, value: Float? -> view.radius = value ?: 0f }
    }

    View(GlassView::class) {
      Name("LucentGlassView")
      Events("onBackdropLuma")

      Prop("sampleBackdrop") { view: GlassView, value: Boolean? -> view.sampleBackdrop = value ?: false }

      Prop("group") { view: GlassView, group: String? ->
        view.group = group ?: GlassRegistry.DEFAULT_GROUP
      }

      Prop("underlay") { view: GlassView, underlay: String? -> view.underlay = underlay }
      Prop("overlay") { view: GlassView, overlay: String? -> view.overlay = overlay }

      Prop("shapes") { view: GlassView, value: FloatArray? -> view.shapes = value }
      Prop("inset") { view: GlassView, value: Float? -> view.inset = value ?: 0f }
      Prop("cornerRadius") { view: GlassView, value: Float? -> view.cornerRadius = value ?: 0f }
      Prop("blend") { view: GlassView, value: Float? -> view.blend = value ?: 0f }
      Prop("blurRadius") { view: GlassView, value: Float? -> view.blurRadius = value ?: 0f }
      Prop("bezel") { view: GlassView, value: Float? -> view.bezel = value ?: 0f }
      Prop("refraction") { view: GlassView, value: Float? -> view.refraction = value ?: 0f }
      Prop("refractOutward") { view: GlassView, value: Boolean? -> view.refractOutward = value ?: false }
      Prop("refractionYScale") { view: GlassView, value: Float? -> view.refractionYScale = value ?: 1f }
      Prop("refractOutwardY") { view: GlassView, value: Boolean? -> view.refractOutwardY = value }
      Prop("falloff") { view: GlassView, value: Float? -> view.falloff = value ?: 0f }
      Prop("bumpPeak") { view: GlassView, value: Float? -> view.bumpPeak = value ?: 0f }
      Prop("bumpShape") { view: GlassView, value: Float? -> view.bumpShape = value ?: 1f }
      Prop("bumpInset") { view: GlassView, value: Float? -> view.bumpInset = value ?: 0f }
      Prop("bumpSplit") { view: GlassView, value: Float? -> view.bumpSplit = value ?: 1f }
      Prop("bumpShapeY") { view: GlassView, value: Float? -> view.bumpShapeY = value ?: 0f }
      Prop("bumpCurve") { view: GlassView, value: Float? -> view.bumpCurve = value ?: 0f }
      Prop("dispersion") { view: GlassView, value: Float? -> view.dispersion = value ?: 0f }
      Prop("magnify") { view: GlassView, value: Float? -> view.magnify = value ?: 0f }
      Prop("magnifyY") { view: GlassView, value: Float? -> view.magnifyY = value ?: -999f }
      Prop("frostMagnify") { view: GlassView, value: Float? -> view.frostMagnify = value ?: 0f }
      Prop("saturation") { view: GlassView, value: Float? -> view.saturation = value ?: 1f }
      Prop("adaptive") { view: GlassView, value: Float? -> view.adaptive = value ?: 0f }
      Prop("dim") { view: GlassView, value: Float? -> view.dim = value ?: 0f }
      Prop("lightAngle") { view: GlassView, value: Float? -> view.lightAngle = value ?: 30f }
      Prop("specular") { view: GlassView, value: Float? -> view.specular = value ?: 0f }
      Prop("highlightWidth") { view: GlassView, value: Float? -> view.highlightWidth = value ?: 2f }
      Prop("edgeSharp") { view: GlassView, value: Float? -> view.edgeSharp = value ?: 0f }
      Prop("edgeSoft") { view: GlassView, value: Float? -> view.edgeSoft = value ?: 0f }
      Prop("sharpWidth") { view: GlassView, value: Float? -> view.sharpWidth = value ?: 0f }
      Prop("softWidth") { view: GlassView, value: Float? -> view.softWidth = value ?: 0f }
      Prop("glowX") { view: GlassView, value: Float? -> view.glowX = value ?: 0f }
      Prop("glowY") { view: GlassView, value: Float? -> view.glowY = value ?: 0f }
      Prop("glowSpread") { view: GlassView, value: Float? -> view.glowSpread = value ?: 0f }
      Prop("glowStrength") { view: GlassView, value: Float? -> view.glowStrength = value ?: 0f }
      Prop("glowShape") { view: GlassView, value: Int? -> view.glowShape = value ?: -1 }
      Prop("shadowRadius") { view: GlassView, value: Float? -> view.shadowRadius = value ?: 0f }
      Prop("shadowOffset") { view: GlassView, value: Float? -> view.shadowOffset = value ?: 0f }
      Prop("shadowSpread") { view: GlassView, value: Float? -> view.shadowSpread = value ?: 0f }
      Prop("shadowGap") { view: GlassView, value: Float? -> view.shadowGap = value ?: 0f }
      Prop("shadowSoft") { view: GlassView, value: Float? -> view.shadowSoft = value ?: 0f }
      Prop("insetSide") { view: GlassView, value: Float? -> view.insetSide = value ?: 0f }
      Prop("insetSideWidth") { view: GlassView, value: Float? -> view.insetSideWidth = value ?: 1f }
      Prop("insetRamp") { view: GlassView, value: Float? -> view.insetRamp = value ?: 0f }
      Prop("pinch") { view: GlassView, value: Float? -> view.pinch = value ?: 0f }
      Prop("pinchWidth") { view: GlassView, value: Float? -> view.pinchWidth = value ?: 0f }
      Prop("pinchSpread") { view: GlassView, value: Float? -> view.pinchSpread = value ?: 0f }
      Prop("rimPrism") { view: GlassView, value: Float? -> view.rimPrism = value ?: 0f }
      Prop("rimWidth") { view: GlassView, value: Float? -> view.rimWidth = value ?: 2f }
      Prop("rimOutside") { view: GlassView, value: Boolean? -> view.rimOutside = value ?: false }
      Prop("rimCrisp") { view: GlassView, value: Boolean? -> view.rimCrisp = value ?: false }
      Prop("rimSide") { view: GlassView, value: Float? -> view.rimSide = value ?: 1f }
      Prop("rimFloor") { view: GlassView, value: Float? -> view.rimFloor = value ?: 0f }
      Prop("rimOptic") { view: GlassView, value: Boolean? -> view.rimOptic = value ?: false }
      Prop("rimOpticTop") { view: GlassView, value: Float? -> view.rimOpticTop = value ?: 0f }
      Prop("rimOpticDarken") { view: GlassView, value: Float? -> view.rimOpticDarken = value ?: 0f }
      Prop("haze") { view: GlassView, value: Float? -> view.haze = value ?: 0f }
      Prop("hazeRadius") { view: GlassView, value: Float? -> view.hazeRadius = value ?: 0f }
      Prop("edgeAxis") { view: GlassView, value: Float? -> view.edgeAxis = value ?: 0f }
      Prop("prismAxis") { view: GlassView, value: Float? -> view.prismAxis = value ?: 0f }
      Prop("prismShift") { view: GlassView, value: Float? -> view.prismShift = value ?: 0f }
      Prop("insetShade") { view: GlassView, value: Float? -> view.insetShade = value ?: 0f }
      Prop("insetOffset") { view: GlassView, value: Float? -> view.insetOffset = value ?: 0f }
      Prop("insetBlur") { view: GlassView, value: Float? -> view.insetBlur = value ?: 0f }
      Prop("pinchLeft") { view: GlassView, value: Float? -> view.pinchLeft = value ?: 0f }
      Prop("pinchRight") { view: GlassView, value: Float? -> view.pinchRight = value ?: 0f }
      Prop("sampleMaxX") { view: GlassView, value: Float? -> view.sampleMaxX = value ?: 0f }
      Prop("ellipse") { view: GlassView, value: Float? -> view.ellipse = value ?: 0f }
      Prop("continuous") { view: GlassView, value: Float? -> view.continuous = value ?: 0f }
      Prop("radiusBottom") { view: GlassView, value: Float? -> view.radiusBottom = value ?: 0f }
      Prop("wallSide") { view: GlassView, value: Float? -> view.wallSide = value ?: 0f }
      Prop("wallRound") { view: GlassView, value: Float? -> view.wallRound = value ?: 1f }
      Prop("wallLead") { view: GlassView, value: Float? -> view.wallLead = value ?: 1f }
      Prop("topBend") { view: GlassView, value: Float? -> view.topBend = value ?: 1f }
      Prop("topDepth") { view: GlassView, value: Float? -> view.topDepth = value ?: 1f }
      Prop("chroma") { view: GlassView, value: Float? -> view.chroma = value ?: 1f }
      Prop("pullBottom") { view: GlassView, value: Float? -> view.pullBottom = value ?: 0f }
      Prop("pullBand") { view: GlassView, value: Float? -> view.pullBand = value ?: 1f }
      Prop("pullTop") { view: GlassView, value: Float? -> view.pullTop = value ?: 0f }
      Prop("pullTopBand") { view: GlassView, value: Float? -> view.pullTopBand = value ?: 1f }
      Prop("rimOut") { view: GlassView, value: Float? -> view.rimOut = value ?: 0f }
      Prop("rimOutBand") { view: GlassView, value: Float? -> view.rimOutBand = value ?: 1f }
      Prop("rimPull") { view: GlassView, value: Float? -> view.rimPull = value ?: 0f }
      Prop("rimPullBand") { view: GlassView, value: Float? -> view.rimPullBand = value ?: 1f }
      Prop("wideRadius") { view: GlassView, value: Float? -> view.wideRadius = value ?: 0f }
      Prop("wideMix") { view: GlassView, value: Float? ->
        view.wideMix = value ?: 0f
        view.invalidate()
      }
      Prop("frost") { view: GlassView, value: Float? -> view.frost = value ?: 0f }
      Prop("frostClear") { view: GlassView, value: Float? -> view.frostClear = value ?: 0f }
      Prop("frostRadius") { view: GlassView, value: Float? -> view.frostRadius = value ?: 0f }
      Prop("fadeBlur") { view: GlassView, value: Float? -> view.fadeBlur = value ?: 0f }
      Prop("fadeFrom") { view: GlassView, value: Float? -> view.fadeFrom = value ?: 0f }
      Prop("fadeTo") { view: GlassView, value: Float? -> view.fadeTo = value ?: 0f }
      Prop("toneBase") { view: GlassView, value: Float? -> view.toneBase = value ?: 0f }
      Prop("toneGain") { view: GlassView, value: Float? -> view.toneGain = value ?: 1f }
      Prop("toneGamma") { view: GlassView, value: Float? -> view.toneGamma = value ?: 1f }
      Prop("toneOn") { view: GlassView, value: Float? -> view.toneOn = value ?: 0f }
      Prop("frostBase") { view: GlassView, value: Float? -> view.frostBase = value ?: 0f }
      Prop("frostGain") { view: GlassView, value: Float? -> view.frostGain = value ?: 1f }
      Prop("frostGamma") { view: GlassView, value: Float? -> view.frostGamma = value ?: 1f }
      Prop("frostChroma") { view: GlassView, value: Float? -> view.frostChroma = value ?: 1f }
      Prop("toneBow") { view: GlassView, value: Float? -> view.toneBow = value ?: 0f }
      Prop("frostBow") { view: GlassView, value: Float? -> view.frostBow = value ?: 0f }
      Prop("tonePre") { view: GlassView, value: Boolean? -> view.tonePre = value ?: false }
      Prop("frostLeft") { view: GlassView, value: Float? -> view.frostLeft = value ?: 0f }
      Prop("frostTop") { view: GlassView, value: Float? -> view.frostTop = value ?: 0f }
      Prop("frostRight") { view: GlassView, value: Float? -> view.frostRight = value ?: 0f }
      Prop("frostBottom") { view: GlassView, value: Float? -> view.frostBottom = value ?: 0f }
      Prop("clipLeft") { view: GlassView, value: Float? -> view.clipLeft = value ?: 0f }
      Prop("clipTop") { view: GlassView, value: Float? -> view.clipTop = value ?: 0f }
      Prop("clipRight") { view: GlassView, value: Float? -> view.clipRight = value ?: 0f }
      Prop("clipBottom") { view: GlassView, value: Float? -> view.clipBottom = value ?: 0f }
      Prop("clipScaleX") { view: GlassView, value: Float? -> view.clipScaleX = value ?: 1f }
      Prop("clipScaleY") { view: GlassView, value: Float? -> view.clipScaleY = value ?: 1f }
      Prop("clipSoft") { view: GlassView, value: Float? -> view.clipSoft = value ?: 0f }
      Prop("aboveTone") { view: GlassView, value: Boolean? -> view.aboveTone = value ?: false }
      Prop("clipContent") { view: GlassView, value: Boolean? -> view.clipContent = value ?: false }
      Prop("clipOn") { view: GlassView, value: Float? -> view.clipOn = value ?: 0f }
      Prop("tint") { view: GlassView, value: Color? -> view.tint = value ?: TRANSPARENT }
      Prop("rim") { view: GlassView, value: Color? -> view.rim = value ?: TRANSPARENT }
      Prop("fallback") { view: GlassView, value: Color? -> view.fallback = value ?: TRANSPARENT }
      Prop("shadow") { view: GlassView, value: Color? -> view.shadow = value ?: TRANSPARENT }
      Prop("plain") { view: GlassView, value: Boolean? -> view.plain = value ?: false }
      Prop("alphaPass") { view: GlassView, value: Boolean? -> view.alphaPass = value ?: false }
      Prop("lift") { view: GlassView, value: Boolean? -> view.lift = value ?: false }
      Prop("outset") { view: GlassView, value: Float? -> view.outset = value ?: 0f }
      Prop("presence") { view: GlassView, value: Float? ->
        view.presence = value ?: 1f
        view.invalidate()
      }
      Prop("glassTint") { view: GlassView, value: Color? -> view.effectTint = value ?: TRANSPARENT }
      Prop("tintDarken") { view: GlassView, value: Float? -> view.tintDarken = value ?: 0f }
      Prop("tintMix") { view: GlassView, value: Float? -> view.tintMix = value ?: 0f }
      Prop("interactive") { view: GlassView, value: Boolean? -> view.interactive = value ?: false }
      Prop("pressScale") { view: GlassView, value: Float? -> view.pressScale = value ?: 1f }
      Prop("pressGrow") { view: GlassView, value: Float? -> view.pressGrow = value ?: 0f }
      Prop("pressGlow") { view: GlassView, value: Float? -> view.pressGlow = value ?: 0f }
      Prop("pressGlowSpread") { view: GlassView, value: Float? -> view.pressGlowSpread = value ?: 0f }
      Prop("pressShapes") { view: GlassView, value: FloatArray? -> view.pressShapes = value }

      OnViewDidUpdateProps { view: GlassView ->
        view.updateEffect()
      }
    }
  }

  private companion object {
    val TRANSPARENT: Color = Color.valueOf(0f, 0f, 0f, 0f)
  }
}
