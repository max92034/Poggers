import type { Character } from './types'

// Three MVP starters — Japanese anime girl archetypes with distinct color palettes.
// Stat triangle: control (School Girl) / chaotic power (Magic Girl) / steady powerhouse (Older Sister).

export const ROSTER: Character[] = [
  {
    id: 'schoolgirl',
    name: 'Aoi',
    archetype: 'School Girl',
    element: 'light',
    palette: { primary: '#1a2a4f', secondary: '#f5f7fa', accent: '#d63031' },
    stats: { power: 5, spin: 5, weight: 5, bounce: 5, control: 9 },
    tagline: 'Calm, precise, beginner-friendly. Steady aim wins the day.',
  },
  {
    id: 'magicalgirl',
    name: 'Lumina',
    archetype: 'Magic Girl',
    element: 'arcane',
    palette: { primary: '#ff8fb1', secondary: '#b18cff', accent: '#ffd166' },
    stats: { power: 9, spin: 8, weight: 3, bounce: 6, control: 3 },
    tagline: 'Explosive magic power, wild scatter. High risk, high reward.',
  },
  {
    id: 'oldersister',
    name: 'Kuroe',
    archetype: 'Older Sister',
    element: 'dark',
    palette: { primary: '#8b1e3f', secondary: '#1a1a1a', accent: '#c9a14a' },
    stats: { power: 6, spin: 4, weight: 9, bounce: 8, control: 6 },
    tagline: 'Heavy, steady, relentless. Pure physical pressure.',
  },
]

export function getCharacter(id: string): Character {
  const c = ROSTER.find((c) => c.id === id)
  if (!c) throw new Error(`Unknown character: ${id}`)
  return c
}
