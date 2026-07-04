import type { VenueId } from './duelConstants'
import { CHIP_TYPES, type ChipParams } from './chipTypes'

// The story ladder. Each rival is a venue + themed roster + skill +
// deadpan dialogue (the world is COMPLETELY serious about POG — see
// ART_DIRECTION.md: never parody).

export interface Rival {
  id: string
  name: string
  title: string
  venue: VenueId
  roster: ChipParams[]
  skill: {
    aimNoise: number       // m std-dev on intended landing point
    speedNoise: number     // fractional power noise
    minStraightness: number
  }
  intro: string
  winLine: string  // rival's line when THEY win
  loseLine: string // rival's line when they lose
}

const t = (key: keyof typeof CHIP_TYPES, mods?: Partial<ChipParams>): ChipParams => ({
  ...CHIP_TYPES[key],
  ...mods,
})

export const STORY_RIVALS: Rival[] = [
  {
    id: 'aoi',
    name: 'Aoi',
    title: 'District Prefect Candidate',
    venue: 'official',
    roster: [t('standard'), t('standard'), t('standard'), t('standard')],
    skill: { aimNoise: 0.45, speedNoise: 0.16, minStraightness: 0.7 },
    intro:
      'Registration confirmed. I should warn you: I have completed all four civic throwing seminars.',
    winLine: 'A clean result. Your chips will be catalogued respectfully.',
    loseLine:
      'Recorded and witnessed. May I ask… where did you learn to land it flat like that?',
  },
  {
    id: 'lumina',
    name: 'Lumina',
    title: 'Idol League, 3rd Seed',
    venue: 'official',
    roster: [
      t('whiteout'),
      t('whiteout'),
      t('standard'),
      t('whiteout'),
    ],
    skill: { aimNoise: 0.34, speedNoise: 0.2, minStraightness: 0.75 },
    intro:
      "My caps are regulation-heavy. The fans love a heavy cap. Try not to cry on camera — it trends.",
    winLine: 'Cut! Perfect. Somebody clip that for the evening broadcast.',
    loseLine:
      "Wait. Wait. The rim — you flipped it BY the rim?! Nobody teaches that. WHO taught you that?",
  },
  {
    id: 'kuroe',
    name: 'Kuroe',
    title: 'Den Mother, Lower Strata',
    venue: 'underground',
    roster: [
      t('warped'),
      t('whiteout', { weight: 1.75, thickness: 1.75, label: 'White-Out ⬜ ⬜' }),
      t('warped', { camber: 1, label: 'Warped 🔥 🔥' }),
      t('standard', { weight: 1.25, thickness: 1.25, label: 'Standard ⬜' }),
    ],
    skill: { aimNoise: 0.22, speedNoise: 0.08, minStraightness: 0.85 },
    intro:
      'No cameras down here. No weigh-in either. Whatever you brought back from 2008 — table it.',
    winLine: 'The tunnel keeps what it wins. Come back when your hands stop shaking.',
    loseLine:
      'Hm. The old arts. So the freezer really did keep one of you… Fine. Take them. You earned it.',
  },
]
