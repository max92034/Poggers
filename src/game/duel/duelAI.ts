import { DUEL } from './duelConstants'
import { getChip } from './chipRegistry'
import { useDuelStore, handPosFor } from './duelStore'
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
} {
  const s = useDuelStore.getState()
  const hand = handPosFor('ai')
  const targets = s.chips.filter((c) => c.side === 'player' && c.status === 'field')

  let aimX: number
  let aimZ: number
  let bestPos: { x: number; z: number } | null = null
  let bestDist = Infinity
  for (const t of targets) {
    const body = getChip(t.id)
    if (!body) continue
    const p = body.translation()
    const d = Math.hypot(p.x - hand[0], p.z - hand[2])
    if (d < bestDist) {
      bestDist = d
      bestPos = { x: p.x, z: p.z }
    }
  }

  if (bestPos) {
    // Land ~1.0m beside the target (small edge gap — closer would overlap
    // and pin it instead of flipping it), perpendicular to the throw line.
    const tx = bestPos.x - hand[0]
    const tz = bestPos.z - hand[2]
    const tlen = Math.hypot(tx, tz) || 1
    const px = -tz / tlen
    const pz = tx / tlen
    const flank = Math.random() < 0.5 ? 1 : -1
    aimX = bestPos.x + px * flank * 1.0 + gauss() * DUEL.aiAimNoise
    aimZ = bestPos.z + pz * flank * 1.0 + gauss() * DUEL.aiAimNoise
  } else {
    // No targets: park defensively on the rival's own half.
    aimX = (Math.random() * 2 - 1) * 1.2
    aimZ = -(0.8 + Math.random() * 1.2)
  }

  const dist = Math.hypot(aimX - hand[0], aimZ - hand[2])
  const required = speedForRange(dist)
  return {
    aimX,
    aimZ,
    speed: required * (1 + gauss() * DUEL.aiSpeedNoise),
    straightness:
      DUEL.aiMinStraightness + Math.random() * (1 - DUEL.aiMinStraightness),
  }
}

/** Approximate standard normal via sum of uniforms. */
function gauss(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
}
