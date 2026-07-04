import { DUEL } from './duelConstants'
import { getChip } from './chipRegistry'

/**
 * The rival's throw brain: aim to land BESIDE the player's chip (where the
 * gust flips best), with gaussian aim noise and imperfect flick quality.
 */
export function computeAiThrow(): {
  dirX: number
  dirZ: number
  speed: number
  straightness: number
} {
  const target = getChip('player')?.translation() ?? { x: 0, y: 0, z: 0.5 }
  const hand = { x: DUEL.spawnPos[0], z: -DUEL.spawnPos[2] } // AI side

  // Ideal landing: ~0.5m to the side of the target chip.
  const tx = target.x - hand.x
  const tz = target.z - hand.z
  const tlen = Math.hypot(tx, tz) || 1
  const px = -tz / tlen // perpendicular
  const pz = tx / tlen
  const side = Math.random() < 0.5 ? 1 : -1
  const lx = target.x + px * side * 0.5 + gauss() * DUEL.aiAimNoise
  const lz = target.z + pz * side * 0.5 + gauss() * DUEL.aiAimNoise

  const dx = lx - hand.x
  const dz = lz - hand.z
  const range = Math.hypot(dx, dz) || 1

  return {
    dirX: dx / range,
    dirZ: dz / range,
    speed: speedForRange(range),
    straightness:
      DUEL.aiMinStraightness + Math.random() * (1 - DUEL.aiMinStraightness),
  }
}

/** Approximate standard normal via sum of uniforms. */
function gauss(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
}

/** Ballistic range of a throw at speed s (fixed pitch, fixed hand height). */
function rangeForSpeed(s: number): number {
  const vy = s * Math.sin(DUEL.throwPitchRad) // downward
  const h = DUEL.spawnPos[1]
  const t = (-vy + Math.sqrt(vy * vy + 4 * 4.905 * h)) / (2 * 4.905)
  return s * Math.cos(DUEL.throwPitchRad) * t
}

/** Invert rangeForSpeed by scanning the legal speed band. */
function speedForRange(r: number): number {
  let best = DUEL.minSpeed
  let bestErr = Infinity
  for (let s = DUEL.minSpeed; s <= DUEL.maxSpeed; s += 0.2) {
    const err = Math.abs(rangeForSpeed(s) - r)
    if (err < bestErr) {
      bestErr = err
      best = s
    }
  }
  return best
}
