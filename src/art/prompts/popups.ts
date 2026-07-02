// SDXL prompts for 2D popup artwork (full-body action poses).
// Image size: landscape_16_9. One image per (character, action) pair.

import type { Character } from '../../game/characters/types'

export type PopupAction = 'critical' | 'defeat' | 'taunt'

export const POPUP_ACTIONS: PopupAction[] = ['critical', 'defeat', 'taunt']

const ARCHETYPE_DESC: Record<string, string> = {
  schoolgirl: 'Japanese school girl in navy sailor seifuku uniform with red ribbon, short black hair',
  magicalgirl: 'Japanese magic girl in pink and lavender transformation outfit with gold sparkles, twin-tails pink hair',
  oldersister: 'Japanese older sister in deep crimson blazer with gold trim, long black hair, mature elegant look',
}

const PALETTE_THEME: Record<string, string> = {
  schoolgirl: 'navy white red color theme',
  magicalgirl: 'pink lavender gold color theme',
  oldersister: 'crimson black gold color theme',
}

const ACTION_DESC: Record<PopupAction, string> = {
  critical: 'critical attack pose, dynamic action, intense expression, dramatic foreshortening',
  defeat: 'defeated pose, fallen on ground, weary expression, dramatic shadow',
  taunt: 'confident taunt pose, hand on hip, smug smile, dramatic wind-blown hair',
}

export function popupPrompt(c: Character, action: PopupAction): string {
  const arch = ARCHETYPE_DESC[c.id] ?? c.archetype
  const pal = PALETTE_THEME[c.id] ?? 'vibrant color theme'
  const act = ACTION_DESC[action]
  return `anime girl, ${arch}, ${act}, dynamic full body, dramatic lighting, cel-shaded, vibrant colors, ${pal}, simple gradient background`
}
