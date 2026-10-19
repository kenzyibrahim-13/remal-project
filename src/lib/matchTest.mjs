// Quick sanity check of the local match engine: `npm run test:match`
import { FALLBACK_NODES } from './nodes.js'
import { localMatch } from './localMatch.js'
import { classifyPixels } from './classify.js'

let failed = 0
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`)
  if (!cond) failed++
}

console.log('--- every demolition site, 40 tons ---')
for (const s of FALLBACK_NODES.filter((n) => n.type === 'demolition')) {
  const r = localMatch({ site_id: s.id, tons: 40 }, FALLBACK_NODES)
  console.log(
    `${s.name.padEnd(26)} ${r.mode.padEnd(10)} plant=${r.plant_id} road=${r.road_id ?? '-'} ` +
      `saved=${r.savings_egp} EGP (${r.savings_pct}%) co2=${r.co2_kg_avoided}kg`,
  )
  check(`${s.id} savings >= 0`, r.savings_egp >= 0)
  check(`${s.id} net <= baseline net`, r.cost_egp.net <= r.baseline_egp.net)
}

console.log('--- fallback: no road projects ---')
const noRoads = FALLBACK_NODES.filter((n) => n.type !== 'road')
const f = localMatch({ site_id: 'd1', tons: 40 }, noRoads)
check('plant_only mode when no roads', f.mode === 'plant_only' && f.road_id === null && f.savings_egp === 0)

console.log('--- small load (5 t, 1 truck) ---')
const s = localMatch({ site_id: 'd2', tons: 5 }, FALLBACK_NODES)
check('1 truck, savings >= 0', s.trips === 1 && s.savings_egp >= 0, `mode=${s.mode}`)

console.log('--- photo grader (synthetic pixels) ---')
const px = (...groups) => {
  const total = groups.reduce((n, [, c]) => n + c, 0)
  const arr = new Uint8ClampedArray(total * 4)
  let i = 0
  for (const [[r, g, b], count] of groups) {
    for (let k = 0; k < count; k++) {
      arr[i++] = r
      arr[i++] = g
      arr[i++] = b
      arr[i++] = 255
    }
  }
  return arr
}
const GREY = [128, 128, 128]
const BRICK = [180, 80, 60]
const BLACK = [20, 20, 20]
const SKY = [100, 160, 235]

let g = classifyPixels(px([GREY, 100]))
check('grey photo -> 100% concrete', g.purity === 100 && g.suggested === 'Pure concrete')
g = classifyPixels(px([BRICK, 100]))
check('red photo -> masonry', g.breakdown.masonry >= 95 && g.suggested === 'Mixed masonry')
g = classifyPixels(px([BLACK, 100]))
check('dark photo -> asphalt', g.breakdown.asphalt >= 95 && g.suggested === 'Asphalt')
g = classifyPixels(px([GREY, 70], [SKY, 30]))
check('sky is ignored', g.purity === 100, `purity=${g.purity}`)
check('all sky -> null', classifyPixels(px([SKY, 100])) === null)
g = classifyPixels(px([GREY, 60], [BRICK, 40]))
check('60/40 concrete/brick', g.purity === 60 && g.suggested === 'Mixed masonry', `purity=${g.purity}`)
check('breakdown sums to 100', Object.values(g.breakdown).reduce((a, b) => a + b, 0) === 100)

process.exit(failed ? 1 : 0)
