import * as THREE from 'three'
import { DUEL } from './duelConstants'

// Lens-profile chip: flat bottom, domed top tapering to a thin edge.
// The taper matters twice: the gust has a lip to catch, and the chip can
// never balance on its rim — every teeter resolves to a face.

/** Radial profile of the top surface: (radiusFraction, height) pairs. */
const TOP_PROFILE: Array<[number, number]> = [
  [0.0, 1.0],   // center: full thickness
  [0.45, 0.92],
  [0.75, 0.6],
  [1.0, 0.18],  // rim: thin edge
]

export function makeChipGeometry(): THREE.BufferGeometry {
  const r = DUEL.chipRadius
  const h = DUEL.chipThickness
  const pts: THREE.Vector2[] = []
  // Lathe profile from rim-bottom, across flat bottom to center, up the
  // axis, then out along the domed top back to the rim.
  pts.push(new THREE.Vector2(r, 0))
  pts.push(new THREE.Vector2(0, 0))
  for (const [rf, hf] of TOP_PROFILE) pts.push(new THREE.Vector2(r * rf + 0.0001, h * hf))
  pts.push(new THREE.Vector2(r, h * TOP_PROFILE[TOP_PROFILE.length - 1][1]))
  const geo = new THREE.LatheGeometry(pts.reverse(), DUEL.chipSegments)
  // Center vertically so the body origin is mid-chip (collider matches).
  geo.translate(0, -h / 2, 0)
  geo.computeVertexNormals()
  return geo
}

/** Convex-hull points for the physics collider (Float32 xyz triplets). */
export function makeChipHullPoints(): Float32Array {
  const r = DUEL.chipRadius
  const h = DUEL.chipThickness
  const seg = DUEL.chipSegments
  const pts: number[] = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    // bottom rim, top thin rim, and the dome shoulder ring
    pts.push(r * c, -h / 2, r * s)
    pts.push(r * c, -h / 2 + h * TOP_PROFILE[TOP_PROFILE.length - 1][1], r * s)
    pts.push(r * 0.45 * c, -h / 2 + h * 0.92, r * 0.45 * s)
  }
  pts.push(0, h / 2, 0) // dome apex
  pts.push(0, -h / 2, 0)
  return new Float32Array(pts)
}
