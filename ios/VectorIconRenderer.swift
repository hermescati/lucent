import ExpoModulesCore
import UIKit

struct VectorLayer: Record {
  @Field var commands: [Double] = []
  @Field var fill: Double? = nil
  @Field var stroke: Double? = nil
  @Field var strokeWidth: Double = 1
  @Field var cap: String = "butt"
  @Field var join: String = "miter"
  @Field var evenOdd: Bool = false
}

enum VectorIconRenderer {
  private static let move = 0.0
  private static let line = 1.0
  private static let curve = 2.0

  static func render(key: String, viewBox: [Double], layers: [VectorLayer], size: Double, scale: Double) throws -> String {
    let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("lucent-icons", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let file = directory.appendingPathComponent("\(key).png")
    if FileManager.default.fileExists(atPath: file.path) {
      return file.absoluteString
    }

    let format = UIGraphicsImageRendererFormat()
    format.scale = scale
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size), format: format)
    let data = renderer.pngData { context in
      let cg = context.cgContext
      let box = viewBox.count == 4 ? viewBox : [0, 0, size, size]
      let fit = min(size / box[2], size / box[3])
      cg.translateBy(x: (size - box[2] * fit) / 2, y: (size - box[3] * fit) / 2)
      cg.scaleBy(x: fit, y: fit)
      cg.translateBy(x: -box[0], y: -box[1])
      for layer in layers {
        let path = makePath(layer.commands)
        if let fill = layer.fill {
          cg.addPath(path)
          cg.setFillColor(color(fill))
          cg.fillPath(using: layer.evenOdd ? .evenOdd : .winding)
        }
        if let stroke = layer.stroke, layer.strokeWidth > 0 {
          cg.addPath(path)
          cg.setStrokeColor(color(stroke))
          cg.setLineWidth(layer.strokeWidth)
          cg.setLineCap(lineCap(layer.cap))
          cg.setLineJoin(lineJoin(layer.join))
          cg.strokePath()
        }
      }
    }
    try data.write(to: file, options: .atomic)
    return file.absoluteString
  }

  private static func makePath(_ commands: [Double]) -> CGPath {
    let path = CGMutablePath()
    var index = 0
    while index < commands.count {
      let command = commands[index]
      if command == move, index + 2 < commands.count {
        path.move(to: CGPoint(x: commands[index + 1], y: commands[index + 2]))
        index += 3
      } else if command == line, index + 2 < commands.count {
        path.addLine(to: CGPoint(x: commands[index + 1], y: commands[index + 2]))
        index += 3
      } else if command == curve, index + 6 < commands.count {
        path.addCurve(
          to: CGPoint(x: commands[index + 5], y: commands[index + 6]),
          control1: CGPoint(x: commands[index + 1], y: commands[index + 2]),
          control2: CGPoint(x: commands[index + 3], y: commands[index + 4])
        )
        index += 7
      } else {
        path.closeSubpath()
        index += 1
      }
    }
    return path
  }

  private static func color(_ value: Double) -> CGColor {
    let argb = UInt32(truncatingIfNeeded: Int64(value))
    return CGColor(
      srgbRed: CGFloat((argb >> 16) & 0xff) / 255,
      green: CGFloat((argb >> 8) & 0xff) / 255,
      blue: CGFloat(argb & 0xff) / 255,
      alpha: CGFloat((argb >> 24) & 0xff) / 255
    )
  }

  private static func lineCap(_ value: String) -> CGLineCap {
    switch value {
    case "round": return .round
    case "square": return .square
    default: return .butt
    }
  }

  private static func lineJoin(_ value: String) -> CGLineJoin {
    switch value {
    case "round": return .round
    case "bevel": return .bevel
    default: return .miter
    }
  }
}
