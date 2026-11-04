package expo.modules.lucent

internal const val MAX_SHAPES = 4

internal const val GLASS_SHADER = """
uniform shader content;
uniform float2 size;
uniform float4 shapes[4];
uniform float shapeCount;
uniform float radius;
uniform float blend;
uniform float bezel;
uniform float refraction;
uniform float direction;
uniform float directionY;
uniform float falloff;
uniform float4 bump;
uniform float bumpY;
uniform float bumpCurve;
uniform float dispersion;
uniform float magnify;
uniform float magnifyY;
uniform float saturation;
uniform float adaptive;
uniform float dim;
uniform float2 light;
uniform float specular;
uniform float highlightWidth;
uniform float edgeSharp;
uniform float edgeSoft;
uniform float sharpWidth;
uniform float softWidth;
uniform float2 glowCenter;
uniform float glowSpread;
uniform float glowStrength;
uniform float shadowRadius;
uniform float shadowGap;
uniform float shadowSoft;
uniform float2 insetSide;
uniform float insetRamp;
uniform float shadowOffset;
uniform float shadowSpread;
uniform float pinch;
uniform float pinchWidth;
uniform float pinchSpread;
uniform float rimPrism;
uniform float rimWidth;
uniform float rimOutside;
uniform float rimSide;
uniform float rimFloor;
uniform float3 axis;
uniform float insetShade;
uniform float insetOffset;
uniform float insetBlur;
uniform float pinchLeft;
uniform float pinchRight;
uniform float sampleMaxX;
uniform float ellipse;
uniform float continuous;
uniform float radiusBottom;
uniform float topBend;
uniform float topDepth;
uniform float2 edgeY;
uniform float2 edgeTop;
uniform float2 rimOut;
uniform float2 rimPull;
uniform float4 frostRect;
uniform float frost;
uniform float frostClear;
uniform float frostRadius;
uniform float frostMagnify;
uniform float3 fadeBlur;
uniform float2 rimOptic;
uniform float2 toneBow;
uniform float tonePre;
uniform float4 tone;
uniform float4 frostTone;
uniform float chroma;
uniform float4 clipRect;
uniform float2 clipScale;
uniform float clipSoft;
uniform float clipOn;
uniform float alphaPass;
uniform float3 wall;
uniform float4 glowShape;
uniform float4 sampleClip;
layout(color) uniform half4 tint;
layout(color) uniform half4 rim;
layout(color) uniform half4 shadow;
layout(color) uniform half4 colorTint;
uniform float2 colorTintModel;

float capsule(float2 p, float4 rect) {
  float2 center = (rect.xy + rect.zw) * 0.5;
  float2 extent = max((rect.zw - rect.xy) * 0.5, float2(0.0));
  float r = min(extent.x, extent.y);
  float corner = radiusBottom > 0.0 && p.y > center.y ? radiusBottom : radius;
  if (corner > 0.0) {
    r = min(r, corner);
  }
  float2 q = abs(p - center) - extent + float2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, float2(0.0))) - r;
}

float wallCapsule(float2 p, float4 rect) {
  float2 center = (rect.xy + rect.zw) * 0.5;
  float2 extent = max((rect.zw - rect.xy) * 0.5, float2(0.0));
  float r = min(extent.x, extent.y);
  if (radius > 0.0) {
    r = min(r, radius);
  }
  r *= (p.x - center.x) * wall.x > 0.0 ? wall.y : wall.z;
  float2 q = abs(p - center) - extent + float2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, float2(0.0))) - r;
}

// Apple's continuous corner (UIBezierPath's rounded rect since iOS 7, cornerCurve = .continuous): three cubics spanning
// 1.52866483r along each edge, easing the curvature in from the straight edge rather than jumping to 1/r. It's described
// here by its distance from the corner's centre, R(alpha), a polynomial in ((alpha - 45deg) / 72.86deg)^2 fitted to the
// cubics within 0.001r; the distance to it is (rho - R) over the gradient's length, exact to first order and equal to the
// straight edge's at the wedge's sides. iOS 27's capsules use it with the radius at half the height, cut at mid-height
// (measured on the simulator, within 0.08pt); its circles stay circles.
float appleRadius(float s) {
  return 1.0017855 + s * (-0.0287977 + s * (-0.6672829 + s * (3.2177690 + s * (-5.2756717 + s * (4.1355015 + s * -1.2528373)))));
}

float appleSlope(float s) {
  return -0.0287977 + s * (2.0 * -0.6672829 + s * (3.0 * 3.2177690 + s * (4.0 * -5.2756717 + s * (5.0 * 4.1355015 + s * 6.0 * -1.2528373))));
}

float continuousCapsule(float2 p, float4 rect) {
  float2 center = (rect.xy + rect.zw) * 0.5;
  float2 extent = max((rect.zw - rect.xy) * 0.5, float2(1.0));
  float r = min(extent.x, extent.y);
  if (radius > 0.0) {
    r = min(r, radius);
  }
  float2 v = abs(p - center) - (extent - float2(r));
  float spread = 1.2717138;
  float alpha = atan(v.y, v.x);
  float u = (alpha - 0.7853982) / spread;
  float d = max(v.x, v.y) - r;
  if (abs(u) < 1.0) {
    float s = u * u;
    float rho = max(length(v), 0.0001);
    float dR = r * appleSlope(s) * 2.0 * u / spread;
    // Eased into the straight sides' depth over the curve's last fifth, where it meets them tangentially: switched
    // outright, the two leave a faint crease there.
    d = mix(d, (rho - r * appleRadius(s)) / sqrt(1.0 + (dR / rho) * (dR / rho)), smoothstep(1.0, 0.8, abs(u)));
  }
  // The same shape with round ends: exact, and smooth everywhere inside. The curve's depth alone jumps across the edges
  // of its wedge, a seam deep in the glass, so deep down it's the round ends' depth, the curve's only toward the edge,
  // where the two shapes differ.
  float circle = length(max(v, float2(0.0))) + min(max(v.x, v.y), 0.0) - r;
  d = mix(circle, d, smoothstep(-0.6 * r, -0.2 * r, circle));
  // A square with a full radius stays a circle, as iOS's are.
  return mix(circle, d, smoothstep(0.0, 0.1 * r, abs(extent.x - extent.y)));
}

float smoothUnion(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / max(k, 0.0001);
  return min(a, b) - h * h * k * 0.25;
}

float oval(float2 p, float4 rect) {
  float2 center = (rect.xy + rect.zw) * 0.5;
  float2 extent = max((rect.zw - rect.xy) * 0.5, float2(1.0));
  float2 q = p - center;
  float k0 = length(q / extent);
  float k1 = length(q / (extent * extent));
  return k0 * (k0 - 1.0) / max(k1, 0.0001);
}

float stadium(float2 p, float4 rect) {
  float2 center = (rect.xy + rect.zw) * 0.5;
  float2 extent = max((rect.zw - rect.xy) * 0.5, float2(0.0));
  float r = min(extent.x, extent.y);
  float2 q = abs(p - center) - extent + float2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, float2(0.0))) - r;
}

float field(float2 p) {
  float d = 100000.0;
  for (int i = 0; i < 4; i++) {
    if (float(i) < shapeCount) {
      float shape = i == 0 && wall.x != 0.0 ? wallCapsule(p, shapes[i]) : capsule(p, shapes[i]);
      if (continuous > 0.0) {
        shape = mix(shape, continuousCapsule(p, shapes[i]), continuous);
      }
      if (i == 0 && ellipse > 0.0) {
        shape = mix(shape, oval(p, shapes[i]), ellipse);
      }
      d = smoothUnion(d, shape, blend);
    }
  }
  if (clipOn > 0.0) {
    float2 q = (p - size * 0.5) * clipScale;
    float wall = stadium(q, clipRect) / max(min(clipScale.x, clipScale.y), 0.01);
    float clipped = -smoothUnion(-d, -wall, clipSoft);
    d = mix(d, clipped, clipOn);
  }
  return d;
}

float bumpBend(float depth, float axis, float width, float curve) {
  float reach = depth / max(mix(1.0, axis, bump.w), 0.001);
  return min(axis * max(depth - bump.z, 0.0), mix(axis, 1.0, bump.w) * refraction * exp(-pow(max(reach - bump.x, 0.0) / width, curve)));
}

float luma(float3 c) {
  return dot(c, float3(0.2126, 0.7152, 0.0722));
}

// The backdrop's brightness that the glass's tone curve (gamma 1) takes to `y`.
float untone(float y) {
  float rise = tone.y + toneBow.x;
  float lift = y - tone.x;
  if (toneBow.x < 0.0001) {
    return clamp(lift / max(tone.y, 0.0001), 0.0, 1.0);
  }
  return clamp((rise - sqrt(max(rise * rise - 4.0 * toneBow.x * lift, 0.0))) / (2.0 * toneBow.x), 0.0, 1.0);
}

// The backdrop that TONE_SHADER's tint and tone took to `c`.
float3 backdropOf(float3 c, float4 glassTint) {
  float toned = clamp(luma(c), 0.0, 1.0);
  float3 tinted = c + untone(toned) - toned;
  return (tinted - glassTint.rgb * glassTint.a) / max(1.0 - glassTint.a, 0.01);
}

float shadowAlpha(float2 p, float dp) {
  float sd = field(p - float2(0.0, shadowOffset)) - shadowSpread;
  float blurWidth = max(shadowRadius, 1.0) * 1.875;
  float soft = 1.0 - smoothstep(-blurWidth, blurWidth, sd);
  float decay = exp(-max(sd, 0.0) / max(shadowRadius, 1.0));
  decay = shadowSoft > 0.0 ? sqrt(soft) : decay;
  float gap = 1.0;
  if (shadowGap > 0.0 && dp < shadowGap * 0.8) {
    float2 sg = float2(field(p + float2(1.0, 0.0)) - field(p - float2(1.0, 0.0)),
                       field(p + float2(0.0, 1.0)) - field(p - float2(0.0, 1.0)));
    float down = max(sg.y, 0.0) / max(length(sg), 0.0001);
    gap = mix(1.0, clamp(0.2 + dp / shadowGap, 0.0, 1.0), down * down);
  }
  return float(shadow.a) * decay * decay * gap;
}

half4 main(float2 coord) {
  float d = field(coord);
  float cover = clamp(0.5 - d, 0.0, 1.0);

  float4 outer = float4(0.0);
  float4 shadowColor = float4(shadow);
  if (shadowColor.a > 0.0) {
    float alpha = shadowAlpha(coord, d) * (1.0 - cover);
    outer = float4(shadowColor.rgb * alpha, alpha);
  }
  float4 rimColor = float4(rim);
  float rimHalf = max(rimWidth, 0.5) * 0.5;
  if (rimOutside > 0.0 && (rimColor.a > 0.0 || rimOutside > 2.5) && d > -max(rimHalf, 0.5) && d < max(rimHalf * 3.0, rimWidth + 0.5)) {
    float2 g = float2(field(coord + float2(1.0, 0.0)) - field(coord - float2(1.0, 0.0)),
                      field(coord + float2(0.0, 1.0)) - field(coord - float2(0.0, 1.0)));
    float gl = length(g);
    float side = gl > 0.0001 ? g.x * g.x / (gl * gl) : 0.0;
    float dn = d / max(gl * 0.5, 0.25);
    float stroke = rimOutside > 1.5
      ? clamp(clamp(0.5 - (dn - rimWidth), 0.0, 1.0) - clamp(0.5 - dn, 0.0, 1.0), 0.0, 1.0) * (1.0 - cover)
      : clamp(1.0 - abs(d - rimHalf) / (rimHalf * 2.0), 0.0, 1.0) * (1.0 - cover);
    if (rimOutside > 2.5) {
      // iOS 27's outline isn't a stroke: it's the backdrop under it, darkened along a curve (0.118 + 0.572b of itself, so
      // it vanishes over black and keeps 69% of white), eased off over light backdrops in dark mode, and weaker where
      // the edge faces up or down. Drawn as a premultiplied colour over the backdrop, so each channel darkens on its own.
      float3 b = content.eval(clamp(coord, float2(0.5), size - float2(0.5))).rgb;
      if (tonePre > 0.5) {
        b = clamp(backdropOf(b, float4(tint)), float3(0.0), float3(1.0));
      }
      float w = stroke * mix(rimOptic.x, 1.0, side);
      float3 m = mix(float3(1.0), (0.118 + 0.572 * b) * (1.0 - rimOptic.y * max(luma(b) - 0.5, 0.0)), w);
      float keep = min(m.r, min(m.g, m.b));
      outer = float4(b * (m - keep), 1.0 - keep) + outer * keep;
    } else {
      float sa = rimColor.a * stroke * (rimOutside > 1.5 ? (rimSide > 0.0 ? mix(rimFloor, 1.0, pow(max(side, 0.0001), rimSide)) : 1.0) : mix(1.0, rimSide, side));
      outer = float4(rimColor.rgb * sa, sa) + outer * (1.0 - sa);
    }
  }
  if (cover <= 0.004) {
    return half4(outer);
  }

  float2 n = float2(field(coord + float2(1.0, 0.0)) - field(coord - float2(1.0, 0.0)),
                    field(coord + float2(0.0, 1.0)) - field(coord - float2(0.0, 1.0)));
  float len = length(n);
  n = len > 0.0001 ? n / len : float2(0.0, -1.0);

  float depth = max(-d, 0.0) / (rimOutside > 1.5 ? max(len * 0.5, 0.25) : 1.0);
  float t = clamp(depth / max(bezel * mix(1.0, topDepth, clamp(-n.y, 0.0, 1.0)), 1.0), 0.0, 1.0);
  float slope;
  float2 bendVec = float2(0.0);
  if (bump.x > 0.0) {
    float bx = bumpBend(depth, abs(n.x), bump.y, bumpCurve > 0.0 ? bumpCurve : 2.0);
    float by = bumpBend(depth, abs(n.y), bumpY > 0.0 ? bumpY : bump.y, 2.0);
    bendVec = float2(sign(n.x) * bx, sign(n.y) * by);
    slope = max(bx, by) / max(refraction, 0.001) * (1.0 - smoothstep(bump.x * 0.5, bump.x, depth));
  } else if (falloff < -0.001) {
    slope = sin(3.14159265 * pow(t, -falloff));
  } else if (falloff > 0.001) {
    float tail = pow(5.0, -falloff);
    slope = (pow(1.0 + 4.0 * t, -falloff) - tail) / (1.0 - tail);
  } else {
    slope = (1.0 - t) * (1.0 - t);
  }

  float2 middle = size * 0.5;
  float2 base = middle + (coord - middle) / (1.0 + float2(magnify, magnifyY > -900.0 ? magnifyY : magnify));
  float2 pinchVec = float2(0.0);
  float pinchSide = n.x < 0.0 ? pinchLeft : pinchRight;
  if (pinch > 0.0 || pinchSide > 0.0) {
    float pinchFade = 1.0 - clamp(depth / max(pinchWidth, 1.0), 0.0, 1.0);
    float ny2 = n.y * n.y;
    float2 vertical = float2(0.0, n.y * ny2 * ny2 * ny2 * pinch);
    float sideAmount = clamp(pinchSide / max(pinch, 1.0), 0.0, 1.0) * smoothstep(0.0, 0.35, abs(n.x));
    pinchVec = mix(vertical, n * pinch, sideAmount) * pinchFade;
  }
  base += pinchVec;
  float2 offset = (bump.x > 0.0 ? bendVec : n * slope * refraction) * float2(direction, directionY) * mix(1.0, topBend, clamp(-n.y, 0.0, 1.0));
  if (rimOut.x > 0.0) {
    float rimReach = 1.0 - clamp(depth / max(rimOut.y, 1.0), 0.0, 1.0);
    offset.x += n.x * rimOut.x * rimReach * rimReach;
  }
  if (rimPull.x > 0.0) {
    float pullReach = 1.0 - clamp(depth / max(rimPull.y, 1.0), 0.0, 1.0);
    offset -= n * rimPull.x * pow(pullReach, 1.7);
  }
  if (edgeTop.x != 0.0 && n.y < 0.0) {
    float reachTop = 1.0 - clamp(depth / max(edgeTop.y, 1.0), 0.0, 1.0);
    offset.y -= edgeTop.x * pow(reachTop, 1.7) * n.y;
  }
  if (edgeY.x > 0.0 && n.y > 0.0) {
    float reach = 1.0 - clamp(depth / max(edgeY.y, 1.0), 0.0, 1.0);
    offset.y -= edgeY.x * pow(reach, 1.7) * n.y;
  }
  float2 lo = max(float2(0.5), sampleClip.xy + float2(0.5));
  float2 hi = min(float2(sampleMaxX > 0.0 ? min(size.x, sampleMaxX) : size.x, size.y), sampleClip.zw) - float2(0.5);
  float3 col;
  float4 centreSample = content.eval(clamp(base + offset, lo, hi));
  float3 centre = centreSample.rgb;
  float alpha = centreSample.a;
  float spread = dispersion * slope * smoothstep(0.02, 0.12, luma(centre));
  float pinchSplit = length(pinchVec) * pinchSpread;
  float shift = axis.z * min((length(offset) + length(pinchVec)) / max(refraction, 1.0), 2.0) * (0.15 + 1.85 * n.x * n.x);
  if (spread > 0.01 || pinchSplit > 0.05 || shift > 0.05) {
    int taps = bump.x > 0.0 ? 16 : 8;
    float3 sum = float3(0.0);
    float3 weight = float3(0.0);
    float alphaSum = 0.0;
    float alphaWeight = 0.0;
    for (int i = 0; i < 16; i++) {
      if (i >= taps) {
        break;
      }
      float s = (float(i) + 0.5) / float(taps);
      float3 w = float3(1.0 - s, 1.0 - abs(2.0 * s - 1.0), s);
      w = w * w;
      float k = 2.0 * s - 1.0;
      float2 uv = clamp(base + offset * (1.0 - spread * k) - pinchVec * (pinchSpread * k) + float2(0.0, shift * k), lo, hi);
      float4 sampled = content.eval(uv);
      sum += sampled.rgb * w;
      weight += w;
      alphaSum += sampled.a * (w.x + w.y + w.z);
      alphaWeight += w.x + w.y + w.z;
    }
    col = sum / weight;
    alpha = alphaSum / alphaWeight;
  } else {
    col = centre;
  }

  // A blur on top of the view's own that eases off down it: radius, then where it starts and stops easing, in y.
  float fadeRadius = fadeBlur.x * (1.0 - smoothstep(fadeBlur.y, fadeBlur.z, coord.y));
  if (fadeRadius > 0.5) {
    float2 at = base + offset;
    float3 disc = float3(0.0);
    float total = 0.0;
    for (int i = 0; i < 24; i++) {
      float f = (float(i) + 0.5) / 24.0;
      float ang = float(i) * 2.39996;
      float w = exp(-2.0 * f);
      disc += content.eval(clamp(at + float2(cos(ang), sin(ang)) * fadeRadius * sqrt(f), lo, hi)).rgb * w;
      total += w;
    }
    col = disc / total;
  }

  float frostEdge = continuous > 0.0 ? mix(capsule(coord, frostRect), continuousCapsule(coord, frostRect), continuous) : capsule(coord, frostRect);
  float frosted = frost > 0.0 ? frost * clamp(0.5 - frostEdge, 0.0, 1.0) : 0.0;
  if (frosted > 0.0 && frostRadius > 0.5) {
    float2 at = base + offset;
    float2 frostMid = (frostRect.xy + frostRect.zw) * 0.5;
    at = frostMid + (at - frostMid) / (1.0 + frostMagnify);
    float3 disc = float3(0.0);
    float total = 0.0;
    for (int i = 0; i < 24; i++) {
      float f = (float(i) + 0.5) / 24.0;
      float r = frostRadius * sqrt(f);
      float ang = float(i) * 2.39996;
      float w = exp(-2.0 * f);
      disc += content.eval(clamp(at + float2(cos(ang), sin(ang)) * r, lo, hi)).rgb * w;
      total += w;
    }
    col = mix(col, disc / total, frosted);
  }
  if (alphaPass > 0.5) {
    float4 lit = float4(col, alpha);
    if (rimPrism > 0.0) {
      float2 across = float2(-n.y, n.x);
      float4 fringe = float4(0.0);
      float lastWarm = 0.0;
      float lastCool = 0.0;
      for (int i = 1; i <= 2; i++) {
        float d = 3.0 * float(i);
        float ahead = content.eval(clamp(base + offset + across * d, lo, hi)).a;
        float behind = content.eval(clamp(base + offset - across * d, lo, hi)).a;
        float edge = (ahead - behind) * slope * rimPrism * clamp(-n.y, 0.0, 1.0);
        float warm = clamp(edge, 0.0, 1.0);
        float cool = clamp(-edge, 0.0, 1.0);
        float bandWarm = max(warm - lastWarm, 0.0);
        float bandCool = max(cool - lastCool, 0.0);
        lastWarm = max(lastWarm, warm);
        lastCool = max(lastCool, cool);
        float3 warmColor = i == 1 ? float3(1.0, 0.85, 0.22) : float3(1.0, 0.96, 0.6);
        float3 coolColor = i == 1 ? float3(0.92, 0.3, 0.78) : float3(0.42, 0.5, 1.0);
        fringe += float4(warmColor * bandWarm + coolColor * bandCool, bandWarm + bandCool);
      }
      fringe = fringe / max(1.0, fringe.a);
      lit += fringe * (1.0 - lit.a);
    }
    return half4(lit * cover);
  }

  float lum = luma(col);
  if (saturation <= 1.0) {
    col = mix(float3(lum), col, saturation);
  } else {
    float chroma = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
    float room = 1.0 - smoothstep(0.2, 0.85, chroma);
    float guard = 1.0 - smoothstep(0.75, 0.98, lum);
    float amount = 1.0 + (saturation - 1.0) * mix(0.3, 1.0, room * guard);
    col = clamp(mix(float3(lum), col, amount), float3(0.0), float3(1.0));
  }

  float4 tintColor = float4(tint);
  if (tonePre > 0.5) {
    // Tinted and toned before the haze's blur (TONE_SHADER), so detail averaged on the curve: back to the backdrop it
    // stands for, to tint and tone as any glass.
    col = backdropOf(col, tintColor);
  }
  col = mix(col, tintColor.rgb, tintColor.a * (1.0 - frosted * frostClear));
  if (tone.w > 0.0) {
    float base = mix(tone.x, frostTone.x, frosted);
    float gain = mix(tone.y, frostTone.y, frosted);
    float curve = mix(tone.z, frostTone.z, frosted);
    float bow = mix(toneBow.x, toneBow.y, frosted);
    // On brightness, with the colour carried over on top, as iOS 27's dark glass does: per channel, the curve would
    // squash a full channel (an orange's red) along with the light.
    float lit = clamp(luma(col), 0.0, 1.0);
    float3 mapped = col - lit + base + gain * pow(lit, curve) + bow * lit * (1.0 - lit);
    col = mix(col, mapped, tone.w);
  }
  float saturate = tone.w > 0.0 ? mix(chroma, frostTone.w, frosted) : chroma;
  if (saturate != 1.0) {
    float washed = luma(col);
    col = clamp(mix(float3(washed), col, saturate), float3(0.0), float3(1.0));
  }
  if (colorTint.a > 0.0) {
    float base = luma(col);
    float floor = tone.x * tone.w;
    float lift = clamp((base - floor) / max(1.0 - floor, 0.01), 0.0, 1.0);
    float3 tinted = 1.0 - (1.0 - float3(colorTint.rgb)) * (1.0 - colorTintModel.y * lift) - colorTintModel.x * (1.0 - base);
    col = mix(col, clamp(tinted, float3(0.0), float3(1.0)), float(colorTint.a));
  }
  if (adaptive > 0.0) {
    float e = smoothstep(0.35, 0.75, luma(col));
    col = mix(col, mix(col, float3(1.0 - e), 0.14 + 0.08 * e), adaptive);
  }
  col *= 1.0 - dim;
  if (glowStrength > 0.0) {
    float2 gd = (coord - glowCenter) / max(glowSpread, 1.0);
    float glowMask = glowShape.z > glowShape.x ? clamp(0.5 - capsule(coord, glowShape), 0.0, 1.0) : shapeCount > 1.5 ? clamp(0.5 - capsule(coord, shapes[0]), 0.0, 1.0) : 1.0;
    col += float3(glowStrength * exp(-0.5 * dot(gd, gd)) * glowMask);
  }

  if (insetSide.x > 0.0) {
    col *= 1.0 - insetSide.x * n.x * n.x * exp(-depth / max(insetSide.y, 1.0));
  }
  if (insetShade > 0.0) {
    float shifted = max(-field(coord - float2(0.0, insetOffset)), 0.0);
    col *= 1.0 - insetShade * smoothstep(0.0, max(insetRamp > 0.0 ? insetRamp : insetOffset, 1.0), -d) * (1.0 - smoothstep(0.0, max(insetBlur, 1.0), shifted));
  }
  float facingY = mix(n.y * n.y, n.x * n.x, axis.x);
  if (edgeSharp < 0.0) {
    float shadeDepth = max(depth - 1.5, 0.0);
    col += float3((edgeSharp * exp(-shadeDepth / max(sharpWidth, 0.1)) + edgeSoft * exp(-depth / max(softWidth, 0.1))) * facingY);
  } else {
    float bevel = clamp(1.0 - depth / max(sharpWidth, 0.1), 0.0, 1.0);
    float edge = (edgeSharp * bevel + edgeSoft * exp(-depth / max(softWidth, 0.1))) * facingY * facingY;
    // On toned (dark) glass the band fades with the fill as iOS 27's does, +0.248 - 0.137 of the fill's brightness
    // (simulator, both modes), scaled to what it adds over the darkest fill, the tone's base.
    float3 faded = col + edge * (0.248 - 0.137 * luma(col)) / (0.248 - 0.137 * tone.x);
    col = mix(col + float3(edge), faded, tone.w);
  }
  col = clamp(col, float3(0.0), float3(1.0));

  float facing = dot(n, -light);
  float lead = pow(max(facing, 0.0), 4.5);
  float trail = pow(max(-facing, 0.0), 4.5);
  float band = clamp(bezel * 0.3, 2.0, highlightWidth);
  float glowIn = clamp((depth - 1.0) / 2.0, 0.0, 1.0);
  float glow = glowIn * pow(clamp(1.0 - (depth - 3.0) / band, 0.0, 1.0), 1.5) * cover;
  float sheen = clamp(1.0 - abs(d + rimHalf) / (rimHalf * 2.0), 0.0, 1.0) * cover;
  float hair = sheen * (1.0 - step(0.5, rimOutside));
  if (rimPrism > 0.0 && bump.x > 0.0) {
    float3 tint = mix(float3(0.25, 0.6, 1.0), float3(1.0, 0.72, 0.25), smoothstep(0.0, 0.5, -2.0 * n.x * n.y));
    col += (tint - dot(tint, float3(1.0 / 3.0))) * exp(-depth / 2.5) * cover * rimPrism;
  } else if (rimPrism > 0.0) {
    float hue = 0.33 + depth * 0.09;
    float3 spectrum = 0.5 + 0.5 * cos(6.2832 * (hue + float3(0.0, 0.33, 0.67)));
    float diagonal = 4.0 * n.x * n.x * n.y * n.y;
    float band = exp(-depth / 3.0) * cover * mix(diagonal * diagonal, n.y * n.y, axis.y);
    col += (spectrum - 0.5) * band * rimPrism;
  }
  col = mix(col, rimColor.rgb, rimColor.a * hair * mix(1.0, rimSide, n.x * n.x));
  col += float3((sheen * 0.7 * (lead + trail) + glow * 0.1 * lead) * specular);
  col = clamp(col, float3(0.0), float3(1.0));
  return half4(float4(col * cover, cover) + outer);
}
"""

// The glass's tint, then its tone curve on brightness with the colour carried over, ahead of the haze's blur (tonePre):
// base, gain, bow.
internal const val TONE_SHADER = """
uniform shader content;
uniform float3 curve;
layout(color) uniform half4 tint;
half4 main(float2 p) {
  half4 c = content.eval(p);
  float3 v = mix(float3(c.rgb) / max(float(c.a), 0.0001), float3(tint.rgb), float(tint.a));
  float lit = clamp(dot(v, float3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
  v += curve.x + curve.y * lit + curve.z * lit * (1.0 - lit) - lit;
  return half4(half3(clamp(v, float3(0.0), float3(1.0)) * float(c.a)), c.a);
}
"""

// The haze's wide blur averages on ((x + 0.2)^2 - 0.04) / 1.4 and back: near enough linear light, as iOS 27's does, to
// land black and white detail's mean where its does, with a slope at black (0.29) that 8 bits a channel between
// effects still carry. A plain square or a cube would band dark colours into blocks.
internal const val HAZE_IN_SHADER = """
uniform shader content;
half4 main(float2 p) {
  half4 c = content.eval(p);
  float3 v = clamp(float3(c.rgb) / max(float(c.a), 0.0001), float3(0.0), float3(1.0));
  v = ((v + 0.2) * (v + 0.2) - 0.04) / 1.4;
  return half4(half3(v * float(c.a)), c.a);
}
"""

internal const val HAZE_OUT_SHADER = """
uniform shader content;
half4 main(float2 p) {
  half4 c = content.eval(p);
  float3 v = clamp(float3(c.rgb) / max(float(c.a), 0.0001), float3(0.0), float3(1.0));
  v = sqrt(v * 1.4 + 0.04) - 0.2;
  return half4(half3(v * float(c.a)), c.a);
}
"""
