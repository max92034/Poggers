// Character data model for Poggers

export type Element = 'light' | 'arcane' | 'dark'

export type StatKey = 'power' | 'spin' | 'weight' | 'bounce' | 'control'

export interface Stats {
  /** Slammer launch velocity multiplier (1-10) */
  power: number
  /** Angular velocity imparted on slammer — affects scatter radius (1-10) */
  spin: number
  /** Slammer mass — heavier = more flip force, slower launch (1-10) */
  weight: number
  /** Slammer restitution — bouncier = multi-hit scatter (1-10) */
  bounce: number
  /** Power meter stability + AI aim tightness (1-10) */
  control: number
}

export interface Character {
  id: string
  name: string
  archetype: string
  element: Element
  /** Primary, secondary, accent — hex strings */
  palette: { primary: string; secondary: string; accent: string }
  stats: Stats
  /** Short tagline shown on character select */
  tagline: string
}

export const STAT_KEYS: StatKey[] = ['power', 'spin', 'weight', 'bounce', 'control']

export const STAT_LABELS: Record<StatKey, string> = {
  power: 'Power',
  spin: 'Spin',
  weight: 'Weight',
  bounce: 'Bounce',
  control: 'Control',
}
