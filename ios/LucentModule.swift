import ExpoModulesCore

public class LucentModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Lucent")

    Function("renderVectorIcon") {
      (key: String, viewBox: [Double], layers: [VectorLayer], size: Double, scale: Double) throws -> String in
      try VectorIconRenderer.render(key: key, viewBox: viewBox, layers: layers, size: size, scale: scale)
    }

    // Named after its class on iOS: `NavigationItemView`.
    View(NavigationItemView.self) {
      Prop("largeTitleInline") { (view: NavigationItemView, value: Bool?) in view.largeTitleInline = value ?? false }
    }
  }
}
