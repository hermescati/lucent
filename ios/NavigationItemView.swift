import ExpoModulesCore
import UIKit

/// Sets what react-native-screens leaves out on a stack screen's navigation item: the large title on the bar's row,
/// beside its buttons (`largeTitleDisplayMode = .inline`). UIKit still draws the bar; this only asks it for that.
///
/// It sits in the screen's content, and reaches the screen's controller through the responder chain once it's in a
/// window. react-native-screens sets `largeTitleDisplayMode` itself whenever it applies the screen's options, so the
/// view watches it and puts `.inline` back, and hands react-native-screens' mode back if `.inline` is no longer asked
/// for.
class NavigationItemView: ExpoView {
  var largeTitleInline = false {
    didSet { applyMode() }
  }

  private weak var item: UINavigationItem?
  private var observation: NSKeyValueObservation?
  // The mode react-native-screens last set.
  private var ownMode: UINavigationItem.LargeTitleDisplayMode?

  override func didMoveToWindow() {
    super.didMoveToWindow()
    let found = window == nil ? nil : screenController()?.navigationItem
    if found !== item {
      observation = nil
      item = found
      ownMode = nil
      observation = found?.observe(\.largeTitleDisplayMode) { [weak self] _, _ in self?.applyMode() }
    }
    applyMode()
  }

  // The nearest controller up the chain: the stack's screen, whose view the content is in.
  private func screenController() -> UIViewController? {
    var responder: UIResponder? = next
    while let current = responder {
      if let controller = current as? UIViewController { return controller }
      responder = current.next
    }
    return nil
  }

  private func applyMode() {
    guard let item, #available(iOS 17.0, *) else { return }
    let mode = item.largeTitleDisplayMode
    if mode != .inline { ownMode = mode }
    if largeTitleInline {
      if mode != .inline { item.largeTitleDisplayMode = .inline }
    } else if mode == .inline, let ownMode {
      item.largeTitleDisplayMode = ownMode
    }
  }
}
