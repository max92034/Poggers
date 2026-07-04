import { DUEL } from './duelConstants'
import { getChip } from './chipRegistry'
import { useDuelStore } from './duelStore'
import { speedForRange } from './ballistics'

/**
 * The rival's throw brain: pick the closest live player chip, aim to land
 * beside it (where the gust flips best), with gaussian aim noise, power
 * noise, and imperfect snap quality. With no targets on the field, place
 * the chip defensively on its own half.
 */
export function computeAiThrow(): {
  aimX: number
  aimZ: number
  speed: number
  straightness: number
  stance: number
} {
  const s = useDuelStore.getState()
  const targets = s.chips.filter((c) => c.side === 'player' && c.status === 'field')

  // Nearest live player chip (distance from the AI's edge center).
  let bestPos: { x: number; z: number } | null = null
  let bestDist = Infinity
  for (const t of targets) {
    const body = getChip(t.id)
    if (!body) continue
    const p = body.translation()
    const d = Math.hypot(p.x, p.z + DUEL.spawnPos[2])
    if (d < bestDist) {
      bestDist = d
      bestPos = { x: p.x, z: p.z }
    }
  }

  let aimX: number
  let aimZ: number
  let stance = 0
  if (bestPos) {
    // Denial approach: land on the CENTER side of the target so the gust
    // tips it outward, toward the ring edge. Aim 1.0m inward of it (any
    // closer would overlap and pin instead of flip).
    const tr = Math.hypot(bestPos.x, bestPos.z) || 1
    const outX = bestPos.x / tr
    const outZ = bestPos.z / tr
    aimX = bestPos.x - outX * 1.0 + gauss() * DUEL.aiAimNoise
    aimZ = bestPos.z - outZ * 1.0 + gauss() * DUEL.aiAimNoise
    // Stance: stand where the hand→aim line continues into the target,
    // i.e. on the arc behind the aim point as seen from the target.
    const backX = aimX - outX * 2.0
    const backZ = aimZ - outZ * 2.0
    // AI arc position for stance φ is (−R·sinφ, −R·cosφ): invert.
    stance = Math.atan2(-backX, -backZ) + gauss() * 0.15
  } else {
    // No targets: park defensively on the rival's own half.
    aimX = (Math.random() * 2 - 1) * 1.2
    aimZ = -(0.8 + Math.random() * 1.2)
  }
  stance = Math.max(-DUEL.stanceMaxRad, Math.min(DUEL.stanceMaxRad, stance))

  // Hand position AT the chosen stance (mirror of handPosFor before the
  // store has been updated with it).
  const r = DUEL.spawnPos[2]
  const hand = [-Math.sin(stance) * r, -Math.cos(stance) * r]
  const dist = Math.hypot(aimX - hand[0], aimZ - hand[1])
  const required = speedForRange(dist)
  return {
    aimX,
    aimZ,
    speed: required * (1 + gauss() * DUEL.aiSpeedNoise),
    straightness:
      DUEL.aiMinStraightness + Math.random() * (1 - DUEL.aiMinStraightness),
    stance,
  }
}

/** Approximate standard normal via sum of uniforms. */
function gauss(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
}
