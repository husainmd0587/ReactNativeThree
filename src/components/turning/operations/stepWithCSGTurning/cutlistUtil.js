export function generateStressCutList({
  totalLength = 60,
  stockRadius = 12,
  outerRadius,
  stepCount = 20,
  taperCount = 5,
  boreCount = 5,
  segments = 64,
  boreSegments = 64,
} = {}) {

  if (!outerRadius) {
    throw new Error('outerRadius (TOOL_OUTER_R) is required')
  }

  const cutList = [{ isStock: true }]

  const stepLength = totalLength / stepCount

  let currentZ = 0
  let currentR = stockRadius

  // ─────────────────────────────────────────────
  // 1️⃣ External Step Turning
  // ─────────────────────────────────────────────
  for (let i = 0; i < stepCount; i++) {
    const nextZ = currentZ + stepLength
    const nextR = Math.max(2, currentR - (stockRadius / stepCount))

    cutList.push({
      type: 'lathe',
      args: {
        points: [
          { z: currentZ, r: nextR },
          { z: currentZ, r: outerRadius },
          { z: nextZ,    r: outerRadius },
          { z: nextZ,    r: nextR },
        ],
        segments,
      },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      cut: true,
      subtract: true,
    })

    currentZ = nextZ
    currentR = nextR
  }

  // ─────────────────────────────────────────────
  // 2️⃣ Taper Finishing Passes
  // ─────────────────────────────────────────────
  for (let i = 0; i < taperCount; i++) {
    const zStart = i * (totalLength / taperCount)
    const zEnd   = zStart + (totalLength / taperCount)

    cutList.push({
      type: 'lathe',
      args: {
        points: [
          { z: zStart, r: 4 - i * 0.4 },
          { z: zStart, r: outerRadius },
          { z: zEnd,   r: outerRadius },
          { z: zEnd,   r: 3 - i * 0.4 },
        ],
        segments,
      },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      cut: true,
      subtract: true,
    })
  }

  // ─────────────────────────────────────────────
  // 3️⃣ Internal Boring Passes
  // ─────────────────────────────────────────────
  for (let i = 0; i < boreCount; i++) {
    const boreDepth  = totalLength * 0.5 + i * 3
    const boreRadius = 2 + i * 0.5

    cutList.push({
      type: 'lathe',
      args: {
        points: [
          { z: 0,          r: 0 },
          { z: 0,          r: boreRadius },
          { z: boreDepth,  r: boreRadius },
          { z: boreDepth,  r: 0 },
        ],
        segments: boreSegments,
      },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 90, y: 0, z: 0 }, // boring axis
      cut: true,
      subtract: true,
    })
  }

  return cutList
}
