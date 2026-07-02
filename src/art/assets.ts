// Asset URL helpers. Generated art lives in /public/art/* and is referenced by absolute URL.
// If a file is missing at runtime, the consuming component falls back to a colored material / placeholder.

import type { PopupAction } from './prompts/popups'

// Use Vite's BASE_URL which automatically handles local dev vs GitHub Pages
const ART_BASE = `${import.meta.env.BASE_URL}art`

export function pogTextureUrl(charId: string): string {
  return `${ART_BASE}/${charId}-pog.png`
}

export function popupImageUrl(charId: string, action: PopupAction): string {
  return `${ART_BASE}/${charId}-popup-${action}.png`
}

export function portraitUrl(charId: string): string {
  // Same as pog texture, used on character-select cards
  return pogTextureUrl(charId)
}
