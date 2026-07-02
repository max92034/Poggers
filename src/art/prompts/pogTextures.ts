// SDXL prompts for pog textures (top-down circular character face art).
// Image size: square. These are versioned for reproducibility —
// edit the prompt wording here and regenerate to iterate on art direction.

import type { Character } from '../../game/characters/types'

export const POG_TEXTURE_PROMPTS: Record<string, string> = {
  schoolgirl:
    'anime girl portrait, Japanese school girl, navy sailor seifuku uniform, white collar, red ribbon, short black hair, neutral calm expression, cel-shaded, vibrant, centered face, clean white background, square composition',
  magicalgirl:
    'anime girl portrait, Japanese magic girl, pink and lavender transformation outfit, gold sparkle accents, twin-tails pink hair, ribbon wand, sweet smile, cel-shaded, vibrant, centered face, clean white background, square composition',
  oldersister:
    'anime girl portrait, Japanese older sister archetype, deep crimson blazer with gold trim, long black hair, confident smile, mature elegant look, cel-shaded, vibrant, centered face, clean white background, square composition',
}

export function pogTexturePrompt(c: Character): string {
  return POG_TEXTURE_PROMPTS[c.id] ?? `anime girl portrait, ${c.archetype}, cel-shaded, centered face, white background, square composition`
}
