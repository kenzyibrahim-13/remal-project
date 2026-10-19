// Quick VISUAL estimate of rubble composition from a photo. Runs fully offline in
// the browser. It looks at pixel colours only (grey = concrete, red/orange = brick
// masonry, very dark = asphalt) and ignores sky and vegetation. It is a rough
// screening aid, NOT a lab test: shadows read as asphalt, dusty brick reads as
// concrete. Say so in the pitch ("visual estimate").

// Brightness (0-1) below which low-saturation grey counts as asphalt. Weathered asphalt
// is dark grey (about RGB 40-95), concrete is lighter. Raise it if asphalt still reads as
// concrete, lower it if shaded concrete reads as asphalt.
const ASPHALT_MAX_V = 0.38

function rgbToHsv(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

/**
 * Pure function over RGBA bytes (canvas ImageData.data). Returns
 * { purity, breakdown: {concrete, masonry, asphalt, other}, suggested, method }
 * or null when too little of the photo looks like rubble.
 */
export function classifyPixels(data) {
  let concrete = 0
  let masonry = 0
  let asphalt = 0
  let other = 0
  let total = 0

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    total++
    const { h, s, v } = rgbToHsv(data[i], data[i + 1], data[i + 2])

    // Background: sky (blue/cyan), vegetation (green), blown-out white haze.
    const sky = h >= 170 && h <= 260 && s > 0.18 && v > 0.35
    const green = h >= 75 && h < 170 && s > 0.25 && v > 0.2
    const haze = v > 0.92 && s < 0.08
    if (sky || green || haze) continue

    if (v < 0.2) asphalt++
    else if (s < 0.22) {
      // Grey pixels: dark grey = asphalt, lighter grey = concrete.
      if (v < ASPHALT_MAX_V) asphalt++
      else concrete++
    } else if (h <= 35 || h >= 340) masonry++
    else other++
  }

  const material = concrete + masonry + asphalt + other
  if (total === 0 || material / total < 0.15) return null

  const pct = (x) => Math.round((x / material) * 100)
  const breakdown = { concrete: pct(concrete), masonry: pct(masonry), asphalt: pct(asphalt), other: 0 }
  breakdown.other = Math.max(0, 100 - breakdown.concrete - breakdown.masonry - breakdown.asphalt)

  const suggested =
    breakdown.concrete >= 70
      ? 'Pure concrete'
      : breakdown.asphalt >= 50
        ? 'Asphalt'
        : breakdown.masonry >= 35
          ? 'Mixed masonry'
          : 'Mixed C&D'

  return { purity: breakdown.concrete, breakdown, suggested, method: 'visual-heuristic' }
}

/** Browser only: downscale the photo, then classify its pixels. */
export async function classifyImageFile(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image load failed'))
      el.src = url
    })
    const scale = Math.min(1, 160 / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, w, h)
    return classifyPixels(ctx.getImageData(0, 0, w, h).data)
  } finally {
    URL.revokeObjectURL(url)
  }
}
