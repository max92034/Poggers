import type { VenueId } from './duelConstants'
import { CHIP_TYPES, type ChipParams } from './chipTypes'

// The story ladder. Each rival is a venue + themed roster + skill +
// deadpan dialogue (the world is COMPLETELY serious about POG — see
// ART_DIRECTION.md: never parody).

export type PortraitMood = 'taunt' | 'critical' | 'defeat'

export interface DialogueLine {
  speaker: string // 'You' for the protagonist; rival name otherwise
  text: string
  // Portrait shown beside the box (attached when the exchange is queued)
  charId?: string
  mood?: PortraitMood
}

export interface Rival {
  id: string
  name: string
  title: string
  charId?: string // popup-art id (public/art/{charId}-popup-*.png)
  venue: VenueId
  roster: ChipParams[]
  skill: {
    aimNoise: number       // m std-dev on intended landing point
    speedNoise: number     // fractional power noise
    minStraightness: number
  }
  introDialogue: DialogueLine[]
  winDialogue: DialogueLine[]  // played when THEY win
  loseDialogue: DialogueLine[] // played when they lose
}

/** Attach the rival's portrait to their spoken lines. */
export function decorate(
  lines: DialogueLine[],
  rival: Rival,
  mood: PortraitMood
): DialogueLine[] {
  return lines.map((l) =>
    l.speaker === 'You' ? l : { ...l, charId: rival.charId, mood }
  )
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
    charId: 'schoolgirl',
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
    winDialogue: [
      { speaker: 'Aoi', text: 'A clean result. Your chips will be catalogued respectfully.' },
      { speaker: 'You', text: 'Catalogued…?' },
      { speaker: 'Aoi', text: 'The district archives every capture. It is an honor, technically.' },
    ],
    loseDialogue: [
      { speaker: 'Aoi', text: 'Recorded and witnessed. The result stands.' },
      {
        speaker: 'Aoi',
        text: 'May I ask… where did you learn to land it flat like that? It is not in any seminar.',
      },
      { speaker: 'You', text: 'Third grade. Behind the gym.' },
    ],
  },
  {
    id: 'lumina',
    name: 'Lumina',
    title: 'Idol League, 3rd Seed',
    charId: 'magicalgirl',
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
    winDialogue: [
      { speaker: 'Lumina', text: 'Cut! Perfect. Somebody clip that for the evening broadcast.' },
      { speaker: 'Lumina', text: "Don't look so gray, specimen. Losing to me trends WONDERFULLY." },
    ],
    loseDialogue: [
      {
        speaker: 'Lumina',
        text: 'Wait. Wait. The rim — you flipped it BY the rim?! Nobody teaches that.',
      },
      { speaker: 'You', text: 'Everybody taught that. There were… so many of us.' },
      { speaker: 'Lumina', text: 'I need your handle. For a collab. Strictly for the fans.' },
    ],
  },
  {
    id: 'kuroe',
    name: 'Kuroe',
    title: 'Den Mother, Lower Strata',
    charId: 'oldersister',
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
    winDialogue: [
      { speaker: 'Kuroe', text: 'The tunnel keeps what it wins.' },
      { speaker: 'Kuroe', text: 'Come back when your hands stop shaking, ancient one.' },
    ],
    loseDialogue: [
      { speaker: 'Kuroe', text: 'Hm. The old arts. So the freezers really did keep one of you.' },
      { speaker: 'Kuroe', text: 'Fine. Take them. You earned it.' },
      {
        speaker: 'Kuroe',
        text: 'One more thing. The Council auditors play "clean". Check their caps anyway.',
      },
      { speaker: 'You', text: '…Check them for what?' },
    ],
  },
  {
    id: 'shizuka',
    name: 'Shizuka',
    title: 'Council Auditor, 4th Chair',
    venue: 'official',
    roster: [
      t('whiteout', { weight: 1.75, thickness: 1.5, label: 'White-Out ⬜ ⬜' }),
      t('warped', { camber: 1, weight: 1.25, label: 'Warped 🔥 🔥 ⬜' }),
      t('whiteout'),
      t('warped', { camber: 1, label: 'Warped 🔥 🔥' }),
    ],
    skill: { aimNoise: 0.16, speedNoise: 0.06, minStraightness: 0.9 },
    introDialogue: [
      {
        speaker: 'Shizuka',
        text: 'The Council thanks the district for its enthusiasm. This audit will be brief.',
      },
      { speaker: 'You', text: 'Your caps. They\'re warped. And painted. This is an OFFICIAL venue.' },
      {
        speaker: 'Shizuka',
        text: 'Council equipment is certified by the Council. The weigh-in applies to citizens.',
      },
      { speaker: 'You', text: 'Kuroe was right about you people.' },
    ],
    winDialogue: [
      { speaker: 'Shizuka', text: 'Audit complete. Finding: the old arts are a myth. As recorded.' },
      { speaker: 'Shizuka', text: 'Your chips will not be catalogued. They will be sealed.' },
    ],
    loseDialogue: [
      { speaker: 'Shizuka', text: '…Re-audit. Equipment failure. Interference. SOMETHING.' },
      { speaker: 'You', text: 'Recorded and witnessed. The result stands.' },
      {
        speaker: 'Shizuka',
        text: 'The Council will hear of this, specimen. The World Table has nine more chairs.',
      },
    ],
  },
]
