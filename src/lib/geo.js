const R_EARTH_KM = 6371

// Great-circle distance between two {lat, lng} points, in km.
export function haversine(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(h))
}

// ASSUMPTION: road distance is ~1.3x straight-line distance in Greater Cairo.
// Replace with a real routing call (or a measured factor) if Member 1 has one.
export const DETOUR_FACTOR = 1.3

export const roadKm = (a, b) => haversine(a, b) * DETOUR_FACTOR
