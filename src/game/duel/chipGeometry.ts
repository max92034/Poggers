import * as THREE from 'three'
import { DUEL } from './duelConstants'
import type { ChipParams } from './duelStore'

// Lens-profile chip: flat bottom, domed top tapering to a thin edge.
// The taper matters twice: the gust has a lip to catch, and the chip can
// never balance on its rim — every teeter resolves to a face.
// Camber raises the dome; thickness scales the whole profile (a tall,
// White-Out-crusted rim reads instantly).

/** Radial profile of the top surface: (radiusFraction, heightFraction). */
const TOP_PROFILE: Array<[number, number]> = [
  [0.0, 1.0],   // center: full thickness
  [0.45, 0.92],
  [0.75, 0.6],
  [1.0, 0.18],  // rim: thin edge
]

function profileFor(params: ChipParams): Array<[number, number]> {
  // Camber lifts the dome (center + shoulder) without thickening the rim.
  const domeBoost = 1 + params.camber * 1.4
  return TOP_PROFILE.map(([rf, hf], i) => [
    rf,
    hf * params.thickness * (i < 3 ? domeBoost : 1),
  ])
}

export function chipHeight(params: ChipParams): number {
  return DUEL.chipThickness * params.thickness * (1 + params.camber * 1.4)
}

const geoCache = new Map<string, THREE.BufferGeometry>()
const hullCache = new Map<string, Float32Array>()

function key(params: ChipParams): string {
  return `${params.camber}|${params.thickness}`
}

export function makeChipGeometry(params: ChipParams): THREE.BufferGeometry {
  const k = key(params)
  const cached = geoCache.get(k)
  if (cached) return cached
  const r = DUEL.chipRadius
  const h = DUEL.chipThickness
  const prof = profileFor(params)
  const pts: THREE.Vector2[] = []
  pts.push(new THREE.Vector2(r, 0))
  pts.push(new THREE.Vector2(0, 0))
  for (const [rf, hf] of prof) pts.push(new THREE.Vector2(r * rf + 0.0001, h * hf))
  pts.push(new THREE.Vector2(r, h * prof[prof.length - 1][1]))
  const geo = new THREE.LatheGeometry(pts.reverse(), DUEL.chipSegments)
  geo.translate(0, -chipHeight(params) / 2, 0)
  geo.computeVertexNormals()
  geoCache.set(k, geo)
  return geo
}

/** Convex-hull points for the physics collider (Float32 xyz triplets). */
export function makeChipHullPoints(params: ChipParams): Float32Array {
  const k = key(params)
  const cached = hullCache.get(k)
  if (cached) return cached
  const r = DUEL.chipRadius
  const h = DUEL.chipThickness
  const seg = DUEL.chipSegments
  const prof = profileFor(params)
  const half = chipHeight(params) / 2
  const pts: number[] = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    pts.push(r * c, -half, r * s)                                  // bottom rim
    pts.push(r * c, -half + h * prof[prof.length - 1][1], r * s)   // top thin rim
    pts.push(r * 0.45 * c, -half + h * prof[1][1], r * 0.45 * s)   // dome shoulder
  }
  pts.push(0, half, 0) // dome apex
  pts.push(0, -half, 0)
  const arr = new Float32Array(pts)
  hullCache.set(k, arr)
  return arr
}
