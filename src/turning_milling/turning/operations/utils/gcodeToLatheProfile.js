import  Interpreter  from '../../gcode/parser/interPreter.js'
import { PassAnalyzer } from '../../gcode/parser/utils/passAnalyzer.js'

/**
 * Convert G-code text into the `allProfiles` array format
 * that StepTurning's generateCncPasses / LatheGeometry expects.
 *
 * Returns:
 *   {
 *     finishProfile: [{r, z}, ...],   // the final target shape (from G71 lookahead or G1 moves)
 *     rawRadius: number,              // stock radius (mm, converted to Three.js units)
 *     allProfiles: [[{r,z}...],...],  // one profile per cutting pass (matches StepTurning's shape)
 *   }
 */
export function gcodeToLatheProfiles(gcodeText, config = {}) {
  const scale = config.scale ?? 0.1       // mm → Three.js: 100mm = 10 units
  const stockRadius = config.stockRadius ?? 50  // mm

  // 1. Run the interpreter
  const interp = new Interpreter({
    machineType: 'LATHE',
    maxX: 300, maxZ: 600,
    rapidRate: 10000,
    ...config,
  })
  interp.load(gcodeText)
  const { timeline, errors } = interp.run()

  // 2. Collect cutting (non-rapid) segments
  const cuttingSegments = timeline.filter(
    seg => seg.type === 'LINEAR' || seg.type === 'ARC_CW' || seg.type === 'ARC_CCW'
  )

  if (cuttingSegments.length === 0) {
    // No cutting moves found — return a plain cylinder
    return {
      finishProfile: [
        { r: stockRadius * scale, z: -5 * scale * 10 },
        { r: stockRadius * scale, z:  5 * scale * 10 },
      ],
      rawRadius: stockRadius * scale,
      allProfiles: [],
      errors,
    }
  }

  // 3. Derive finish profile from the G-code's final intended shape.
  //    Strategy: collect all unique Z positions that appear in cutting moves,
  //    then for each Z compute the minimum X (radius) reached — that's the
  //    finished diameter at that axial position.
  const zMap = new Map()   // z_scaled → min_r_scaled

  cuttingSegments.forEach(seg => {
    const pts = seg.points ?? [seg.start, seg.end]
    pts.forEach(pt => {
      // Lathe: X is diameter in G-code → radius = X/2
      const r = (pt.X / 2) * scale
      const z = pt.Z * scale
      const key = z.toFixed(4)
      if (!zMap.has(key) || zMap.get(key) > r) {
        zMap.set(key, r)
      }
    })
  })

  // Sort by Z ascending (StepTurning expects profile ordered from chuck end to tailstock)
  const sortedZ = [...zMap.entries()]
    .map(([zStr, r]) => ({ z: parseFloat(zStr), r }))
    .sort((a, b) => a.z - b.z)

  // Ensure profile is closed (r=0 caps at each end for LatheGeometry)
  const finishProfile = [
    { z: sortedZ[0].z,  r: 0 },
    ...sortedZ,
    { z: sortedZ.at(-1).z, r: 0 },
  ]

  // 4. Build per-pass profiles using PassAnalyzer
  const analyzer = new PassAnalyzer({ machineType: 'LATHE' })
  const passes   = analyzer.analyze(timeline, {})

  // Each pass: snapshot of the stock after removing material up to this pass
  const allProfiles = buildProgressiveProfiles(passes, finishProfile, stockRadius * scale, scale)

  return {
    finishProfile,
    rawRadius: stockRadius * scale,
    allProfiles,
    errors,
  }
}

/**
 * For each pass, compute what the stock profile looks like *after* that pass.
 * This is the same logic as generateCncPasses() but driven by actual G-code segments
 * instead of a depth-per-pass constant.
 */
function buildProgressiveProfiles(passes, finishProfile, stockRadius, scale) {
  // Start with a uniform cylinder
  let currentProfile = finishProfile.map(p => ({ z: p.z, r: stockRadius }))
  const result = [currentProfile]  // index 0 = raw stock

  passes.forEach(pass => {
    // Collect the minimum radius reached at each Z in this pass
    const passZMap = new Map()

    pass.segments.forEach(seg => {
      if (seg.type === 'RAPID') return
      const pts = seg.points ?? [seg.start, seg.end]
      pts.forEach(pt => {
        const r   = (pt.X / 2) * scale
        const z   = pt.Z * scale
        const key = z.toFixed(3)
        if (!passZMap.has(key) || passZMap.get(key) > r) {
          passZMap.set(key, r)
        }
      })
    })

    if (passZMap.size === 0) return  // Rapid-only pass, skip

    // Apply: for each profile point, check if this pass cut there
    const nextProfile = currentProfile.map(pt => {
      const key = pt.z.toFixed(3)
      if (passZMap.has(key)) {
        const cutR = passZMap.get(key)
        return { z: pt.z, r: Math.min(pt.r, cutR) }
      }
      return { ...pt }
    })

    result.push(nextProfile)
    currentProfile = nextProfile
  })

  return result
}