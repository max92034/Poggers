// Rogue-lite item system for Poggers.
// Items attach to the slammer and modify its physics + visual appearance.

export type ItemId = 'pocket-lighter' | 'chewing-gum' | 'baby-oil' | 'magnets'

export interface SlammerItem {
  id: ItemId
  name: string
  description: string
  // Physics modifiers (applied multiplicatively/additively to base values)
  massMult?: number
  massAdd?: number
  spinMult?: number
  restitutionAdd?: number
  frictionMult?: number
  // Visual variant
  visualType: 'default' | 'u-shape' | 'gum-blob' | 'magnetic-glow'
  // Special flags
  makesOpponentSlippery?: boolean
  slipperyFrictionMult?: number
  slipperyRestitutionAdd?: number
  hasMagneticField?: boolean
  magnetRadius?: number
  magnetStrength?: number
}

export interface ItemSlot {
  item: SlammerItem
  equipped: boolean
}
