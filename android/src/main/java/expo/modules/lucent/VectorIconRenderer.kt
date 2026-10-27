package expo.modules.lucent

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.net.Uri
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileOutputStream
import kotlin.math.ceil
import kotlin.math.min

class VectorLayer : Record {
  @Field val commands: List<Double> = emptyList()
  @Field val fill: Double? = null
  @Field val stroke: Double? = null
  @Field val strokeWidth: Double = 1.0
  @Field val cap: String = "butt"
  @Field val join: String = "miter"
  @Field val evenOdd: Boolean = false
}

object VectorIconRenderer {
  private const val MOVE = 0.0
  private const val LINE = 1.0
  private const val CURVE = 2.0

  fun render(cacheDirectory: File, key: String, viewBox: List<Double>, layers: List<VectorLayer>, size: Double, scale: Double): String {
    val directory = File(cacheDirectory, "lucent-icons").apply { mkdirs() }
    val file = File(directory, "$key.png")
    if (file.exists()) {
      return Uri.fromFile(file).toString()
    }

    val pixels = ceil(size * scale).toInt().coerceAtLeast(1)
    val bitmap = Bitmap.createBitmap(pixels, pixels, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val box = if (viewBox.size == 4) viewBox else listOf(0.0, 0.0, size, size)
    val fit = min(size / box[2], size / box[3])
    canvas.scale(scale.toFloat(), scale.toFloat())
    canvas.translate(((size - box[2] * fit) / 2).toFloat(), ((size - box[3] * fit) / 2).toFloat())
    canvas.scale(fit.toFloat(), fit.toFloat())
    canvas.translate(-box[0].toFloat(), -box[1].toFloat())

    for (layer in layers) {
      val path = makePath(layer.commands)
      layer.fill?.let { fill ->
        path.fillType = if (layer.evenOdd) Path.FillType.EVEN_ODD else Path.FillType.WINDING
        canvas.drawPath(path, Paint(Paint.ANTI_ALIAS_FLAG).apply {
          style = Paint.Style.FILL
          color = argb(fill)
        })
      }
      val stroke = layer.stroke
      if (stroke != null && layer.strokeWidth > 0) {
        canvas.drawPath(path, Paint(Paint.ANTI_ALIAS_FLAG).apply {
          style = Paint.Style.STROKE
          color = argb(stroke)
          strokeWidth = layer.strokeWidth.toFloat()
          strokeCap = when (layer.cap) {
            "round" -> Paint.Cap.ROUND
            "square" -> Paint.Cap.SQUARE
            else -> Paint.Cap.BUTT
          }
          strokeJoin = when (layer.join) {
            "round" -> Paint.Join.ROUND
            "bevel" -> Paint.Join.BEVEL
            else -> Paint.Join.MITER
          }
        })
      }
    }

    FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    bitmap.recycle()
    return Uri.fromFile(file).toString()
  }

  private fun makePath(commands: List<Double>): Path {
    val path = Path()
    var index = 0
    while (index < commands.size) {
      val command = commands[index]
      if (command == MOVE && index + 2 < commands.size) {
        path.moveTo(commands[index + 1].toFloat(), commands[index + 2].toFloat())
        index += 3
      } else if (command == LINE && index + 2 < commands.size) {
        path.lineTo(commands[index + 1].toFloat(), commands[index + 2].toFloat())
        index += 3
      } else if (command == CURVE && index + 6 < commands.size) {
        path.cubicTo(
          commands[index + 1].toFloat(), commands[index + 2].toFloat(),
          commands[index + 3].toFloat(), commands[index + 4].toFloat(),
          commands[index + 5].toFloat(), commands[index + 6].toFloat(),
        )
        index += 7
      } else {
        path.close()
        index += 1
      }
    }
    return path
  }

  private fun argb(value: Double): Int = value.toLong().toInt()
}
