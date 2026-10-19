import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { TYPE_META } from '../lib/nodes.js'

// OpenStreetMap tiles for both themes; dark mode is a CSS filter in index.css.
const TILES = {
  dark: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  light: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
}
const ATTRIB = '&copy; OpenStreetMap contributors'
const CAIRO = [30.04, 31.3]

// Animate a polyline being drawn with a "truck" dot travelling along it.
function animateRoute(layer, points, durationMs = 2400) {
  const lls = points.map((p) => L.latLng(p.lat, p.lng))
  const seg = []
  let total = 0
  for (let i = 0; i < lls.length - 1; i++) {
    const d = lls[i].distanceTo(lls[i + 1])
    seg.push(d)
    total += d
  }
  const line = L.polyline([lls[0]], { color: '#fbbf24', weight: 4, opacity: 0.95, dashArray: '10 8' }).addTo(layer)
  const truck = L.circleMarker(lls[0], {
    radius: 7,
    color: '#ffffff',
    weight: 2,
    fillColor: '#fbbf24',
    fillOpacity: 1,
  }).addTo(layer)

  const start = performance.now()
  let raf = 0
  const step = (now) => {
    const t = Math.min(1, (now - start) / durationMs)
    let dist = t * total
    const cur = [lls[0]]
    let i = 0
    while (i < seg.length && dist > seg[i]) {
      dist -= seg[i]
      cur.push(lls[i + 1])
      i++
    }
    if (i < seg.length) {
      const f = seg[i] ? dist / seg[i] : 0
      const a = lls[i]
      const b = lls[i + 1]
      cur.push(L.latLng(a.lat + (b.lat - a.lat) * f, a.lng + (b.lng - a.lng) * f))
    }
    line.setLatLngs(cur)
    truck.setLatLng(cur[cur.length - 1])
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

export default function MapView({ nodes, selectedSiteId, onSelectSite, result, theme }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const tileRef = useRef(null)
  const markerLayerRef = useRef(null)
  const routeLayerRef = useRef(null)

  // Init map once
  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true }).setView(CAIRO, 10)
    mapRef.current = map
    markerLayerRef.current = L.layerGroup().addTo(map)
    routeLayerRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Tile layer follows theme. If the network is down, tiles just don't load
  // and the styled grid background + pins + routes still work.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (tileRef.current) map.removeLayer(tileRef.current)
    tileRef.current = L.tileLayer(TILES[theme], {
      attribution: ATTRIB,
      maxZoom: 19,
    }).addTo(map)
    tileRef.current.on('tileerror', () => {})
  }, [theme])

  // Theme class is toggled directly on the element. Do NOT put it in the JSX className:
  // React would overwrite the whole class attribute and wipe Leaflet's own classes.
  useEffect(() => {
    elRef.current?.classList.toggle('light', theme === 'light')
  }, [theme])

  // Pins
  useEffect(() => {
    const layer = markerLayerRef.current
    if (!layer) return
    layer.clearLayers()
    for (const n of nodes) {
      const meta = TYPE_META[n.type]
      const selected = n.id === selectedSiteId
      const m = L.circleMarker([n.lat, n.lng], {
        radius: selected ? 12 : 9,
        color: selected ? '#ffffff' : meta.color,
        weight: selected ? 3 : 2,
        fillColor: meta.color,
        fillOpacity: 0.85,
      }).addTo(layer)
      m.bindTooltip(`${n.name}<br/><span style="opacity:.7">${meta.label}</span>`, {
        className: 'remal-tip',
        direction: 'top',
      })
      if (n.type === 'demolition') m.on('click', () => onSelectSite(n.id))
    }
  }, [nodes, selectedSiteId, onSelectSite])

  // Route animation
  useEffect(() => {
    const map = mapRef.current
    const layer = routeLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (!result) return
    const pts = result.route
    map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [80, 80], maxZoom: 12 })
    return animateRoute(layer, pts)
  }, [result])

  return <div ref={elRef} className="remal-map" />
}
