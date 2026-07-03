import type { SlammerItem } from './types'

/**
 * Compute slammer mass with item modifiers.
 * Base mass is already computed from the character's weight stat.
 */
export function computeSlammerMass(baseMass: number, items: SlammerItem[]): number {
  let mass = baseMass
  for (const item of items) {
    if (item.massMult) mass *= item.massMult
    if (item.massAdd) mass += item.massAdd
  }
  return Math.max(0.05, mass)
}

/**
 * Compute slammer spin impulse magnitude with item modifiers.
 * Base spin is already computed from the character's spin stat.
 */
export function computeSlammerSpin(baseSpin: number, items: SlammerItem[]): number {
  let spin = baseSpin
  for (const item of items) {
    if (item.spinMult) spin *= item.spinMult
  }
  return spin
}

/**
 * Compute slammer restitution with item modifiers.
 */
export function computeSlammerRestitution(baseRest: number, items: SlammerItem[]): number {
  let rest = baseRest
  for (const item of items) {
    if (item.restitutionAdd) rest += item.restitutionAdd
  }
  return Math.min(0.95, Math.max(0.0, rest))
}

/**
 * Compute slammer friction with item modifiers.
 */
export function computeSlammerFriction(baseFriction: number, items: SlammerItem[]): number {
  let fric = baseFriction
  for (const item of items) {
    if (item.frictionMult) fric *= item.frictionMult
  }
  return Math.min(1.0, Math.max(0.05, fric))
}

/**
 * Returns true if the given item list includes Baby Oil (or any slippery-causing item).
 */
export function causesOpponentSlippery(items: SlammerItem[]): boolean {
  return items.some((i) => i.makesOpponentSlippery)
}

/**
 * Compute slippery pog friction.
 */
export function computeSlipperyFriction(baseFriction: number, items: SlammerItem[]): number {
  const slipperyItem = items.find((i) => i.makesOpponentSlippery)
  if (!slipperyItem || !slipperyItem.slipperyFrictionMult) return baseFriction
  return Math.min(1.0, Math.max(0.05, baseFriction * slipperyItem.slipperyFrictionMult))
}

/**
 * Compute slippery pog restitution.
 */
export function computeSlipperyRestitution(baseRest: number, items: SlammerItem[]): number {
  const slipperyItem = items.find((i) => i.makesOpponentSlippery)
  if (!slipperyItem || !slipperyItem.slipperyRestitutionAdd) return baseRest
  return Math.min(0.95, Math.max(0.0, baseRest + slipperyItem.slipperyRestitutionAdd))
}
