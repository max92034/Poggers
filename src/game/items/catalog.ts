import type { SlammerItem } from './types'

export const ITEM_CATALOG: SlammerItem[] = [
  {
    id: 'pocket-lighter',
    name: 'Pocket Lighter',
    description:
      'Bend the slammer into a U-shape. Lighter body means faster spins and more bounce.',
    massMult: 0.85,
    spinMult: 1.2,
    restitutionAdd: 0.1,
    visualType: 'u-shape',
  },
  {
    id: 'chewing-gum',
    name: 'Chewing Gum',
    description:
      'A sticky wad of gum on the slammer. Heavier weight + extra rotation. Pogs grip and tumble harder on impact.',
    massAdd: 0.08,
    spinMult: 1.3,
    frictionMult: 1.5,
    visualType: 'gum-blob',
  },
  {
    id: 'baby-oil',
    name: 'Baby Oil',
    description:
      'Coat the opponent\'s pogs in oil for their turn. Slippery pogs slide away instead of flipping.',
    makesOpponentSlippery: true,
    slipperyFrictionMult: 0.3,
    slipperyRestitutionAdd: 0.25,
    visualType: 'default',
  },
  {
    id: 'magnets',
    name: 'Magnets',
    description:
      'Boost rotational power dramatically. Attracts metallic pogs — note: metallic pog types coming in a future elemental patch.',
    spinMult: 1.5,
    visualType: 'magnetic-glow',
    hasMagneticField: true,
    magnetRadius: 2.5,
    magnetStrength: 0.02,
  },
]

export function getItem(id: string): SlammerItem | undefined {
  return ITEM_CATALOG.find((i) => i.id === id)
}
