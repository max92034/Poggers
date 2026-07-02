import type { Character } from '../characters/types'
import { STAT_PHYSICS } from '../physics/constants'

export interface AiDecision {
  aimAngle: number  // radians
  power: number     // 0-100
}

/**
 * Stat-based AI opponent.
 * - Aims at stack centroid (angle 0) with Gaussian-style noise scaled by 1/control.
 * - Power picked based on power stat (stronger chars tend to swing harder) with variance.
 */
export function chooseAiShot(aiChar: Character, round: number): AiDecision {
  // Lower control = wider aim noise. Range: control 10 → 0.05 rad, control 1 → 0.6 rad.
  const controlNoise = (1 - aiChar.stats.control / 10) * 0.6 + 0.05

  // Box-Muller transform for a Gaussian sample
  const u1 = Math.max(Math.random(), 1e-6)
  const u2 = Math.random()
  const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  const aimAngle = gaussian * controlNoise

  // Power: base on character's power stat. Stronger chars naturally hit harder.
  // Add slight bias toward higher power in later rounds (AI "tries harder" as match progresses).
  const basePower = 30 + (aiChar.stats.power / 10) * 45 // 30-75
  const roundBias = Math.min(round - 1, 4) * 3 // 0-12 boost over 5 rounds
  const variance = (Math.random() - 0.5) * 20 // ±10
  const power = Math.max(20, Math.min(95, basePower + roundBias + variance))

  // Reference STAT_PHYSICS to keep the import meaningful for future tuning hooks
  void STAT_PHYSICS

  return { aimAngle, power }
}
