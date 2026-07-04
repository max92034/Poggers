import type { VenueId } from './duelConstants'
import { CHIP_TYPES, type ChipParams } from './chipTypes'

// The story ladder. Each rival is a venue + themed roster + skill +
// deadpan dialogue (the world is COMPLETELY serious about POG — see
// ART_DIRECTION.md: never parody).

export interface DialogueLine {
  speaker: string // 'You' for the protagonist; rival name otherwise
  text: string
}

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
  introDialogue: DialogueLine[]
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
    introDialogue: [
      {
        speaker: 'Aoi',
        text: "Registration confirmed. Duelist designation… 'pre-war specimen'? Is that a clerical joke?",
      },
      {
        speaker: 'You',
        text: 'I was frozen in 2008. Where I come from, we played this at recess.',
      },
      {
        speaker: 'Aoi',
        text: '"Recess." I trained eleven years for this. I should warn you: I have completed all four civic throwing seminars.',
      },
      { speaker: 'You', text: 'Four whole seminars.' },
    ],
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
    introDialogue: [
      {
        speaker: 'Lumina',
        text: 'My caps are regulation-heavy. Certified at the weigh-in. The fans love a heavy cap.',
      },
      {
        speaker: 'You',
        text: "Back home we called that 'painting it'. My school banned it in third grade.",
      },
      {
        speaker: 'Lumina',
        text: 'Banned? What kind of barbaric century BANNED cap tuning?',
      },
      {
        speaker: 'Lumina',
        text: "Whatever. Try not to cry on camera — it trends, and not in your favor.",
      },
    ],
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
    introDialogue: [
      { speaker: 'Kuroe', text: 'No cameras down here. No weigh-in either.' },
      {
        speaker: 'Kuroe',
        text: 'The Council says the old arts died in the freezers. Yet the district net keeps clipping a man who flips caps by the rim.',
      },
      { speaker: 'You', text: "They're recess tricks. Honestly." },
      {
        speaker: 'Kuroe',
        text: '"Recess." Table your chips, ancient one. The tunnel keeps what it wins.',
      },
    ],
    winLine: 'The tunnel keeps what it wins. Come back when your hands stop shaking.',
    loseLine:
      'Hm. The old arts. So the freezer really did keep one of you… Fine. Take them. You earned it.',
  },
]
