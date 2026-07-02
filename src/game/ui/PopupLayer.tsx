import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getCharacter } from '../characters/roster'
import { popupImageUrl } from '../../art/assets'
import type { PopupAction } from '../../art/prompts/popups'
import './PopupLayer.css'

const ACTION_LABEL: Record<PopupAction, string> = {
  critical: 'Critical!',
  defeat: 'Defeated',
  taunt: '',
}

const ACTION_DURATION_MS: Record<PopupAction, number> = {
  taunt: 1600,
  critical: 2200,
  defeat: 3000,
}

export function PopupLayer() {
  const popups = useGameStore((s) => s.popups)
  const dismissPopup = useGameStore((s) => s.dismissPopup)
  const [imgOk, setImgOk] = useState<Record<number, boolean>>({})

  // The currently-displayed popup is the first in the queue
  const current = popups[0]

  useEffect(() => {
    if (!current) return
    const dur = ACTION_DURATION_MS[current.action]
    const timer = window.setTimeout(() => dismissPopup(current.id), dur)
    return () => window.clearTimeout(timer)
  }, [current, dismissPopup])

  // Reset image-load state when popup changes
  useEffect(() => {
    setImgOk({})
  }, [current?.id])

  if (!current) return null

  const char = getCharacter(current.charId)
  const url = popupImageUrl(current.charId, current.action)
  const showImage = imgOk[current.id] !== false // undefined = loading, true = ok, false = error

  return (
    <div
      className={`popup-layer popup-action-${current.action} popup-side-${current.side}`}
      onClick={() => dismissPopup(current.id)}
    >
      <div className="popup-backdrop" />
      <div className="popup-art-wrap">
        {showImage && (
          <img
            key={current.id}
            src={url}
            alt={`${char.name} ${current.action}`}
            className="popup-art"
            onError={() => setImgOk((s) => ({ ...s, [current.id]: false }))}
          />
        )}
        {imgOk[current.id] === false && (
          <div className="popup-art-fallback" style={{ background: char.palette.primary }}>
            <div className="popup-art-fallback-inner" style={{ color: char.palette.secondary }}>
              <span className="popup-fallback-name">{char.name}</span>
              <span className="popup-fallback-arch">{char.archetype}</span>
            </div>
          </div>
        )}
      </div>
      <div className="popup-caption">
        <div className="popup-name" style={{ color: char.palette.accent }}>{char.name}</div>
        {ACTION_LABEL[current.action] && (
          <div className="popup-action">{ACTION_LABEL[current.action]}</div>
        )}
      </div>
    </div>
  )
}
