import { DUEL } from './duelConstants'

/** Ballistic range of a throw at speed s (fixed pitch, fixed hand height). */
export function rangeForSpeed(s: number): number {
  const vy = s * Math.sin(DUEL.throwPitchRad) // downward
  const h = DUEL.spawnPos[1]
  const t = (-vy + Math.sqrt(vy * vy + 4 * 4.905 * h)) / (2 * 4.905)
  return s * Math.cos(DUEL.throwPitchRad) * t
}

/** Invert rangeForSpeed by scanning the legal speed band. */
export function speedForRange(r: number): number {
  let best = DUEL.minSpeed
  let bestErr = Infinity
  for (let s = DUEL.minSpeed; s <= DUEL.maxSpeed; s += 0.1) {
    const err = Math.abs(rangeForSpeed(s) - r)
    if (err < bestErr) {
      bestErr = err
      best = s
    }
  }
  return best
}
