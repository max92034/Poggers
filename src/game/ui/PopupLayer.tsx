import { useEffect, useRef, useState } from 'react'
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

type PopupPosition = 'top' | 'bottom' | 'center'

function positionForAction(action: PopupAction): PopupPosition {
  if (action === 'critical') return 'top'
  if (action === 'defeat') return 'bottom'
  return 'center'
}

export function PopupLayer() {
  const popups = useGameStore((s) => s.popups)
  const dismissPopup = useGameStore((s) => s.dismissPopup)

  // Per-popup image-load state (keyed by popup id)
  const [imgOk, setImgOk] = useState<Record<number, boolean>>({})
  // Per-popup natural aspect ratio (keyed by popup id) — used to size the wrap
  const [imgRatio, setImgRatio] = useState<Record<number, number>>({})
  // Per-popup auto-dismiss timers
  const timersRef = useRef<Record<number, number>>({})

  // Schedule an auto-dismiss timer for every popup.
  useEffect(() => {
    popups.forEach((p) => {
      if (timersRef.current[p.id] != null) return
      const dur = ACTION_DURATION_MS[p.action]
      const handle = window.setTimeout(() => {
        dismissPopup(p.id)
        delete timersRef.current[p.id]
      }, dur)
      timersRef.current[p.id] = handle
    })
    // Clear timers for popups that no longer exist
    const liveIds = new Set(popups.map((p) => p.id))
    Object.keys(timersRef.current).forEach((idStr) => {
      const id = Number(idStr)
      if (!liveIds.has(id)) {
        window.clearTimeout(timersRef.current[id])
        delete timersRef.current[id]
      }
    })
  }, [popups, dismissPopup])

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((h) => window.clearTimeout(h))
      timersRef.current = {}
    }
  }, [])

  if (popups.length === 0) return null

  return (
    <div className="popup-stage">
      {popups.map((p) => {
        const char = getCharacter(p.charId)
        const url = popupImageUrl(p.charId, p.action)
        const showImage = imgOk[p.id] !== false
        const pos = positionForAction(p.action)
        const ratio = imgRatio[p.id]
        return (
          <div
            key={p.id}
            className={`popup-layer popup-action-${p.action} popup-side-${p.side} popup-pos-${pos}`}
            onClick={() => dismissPopup(p.id)}
          >
            <div className="popup-art-wrap" style={ratio ? { aspectRatio: `${ratio}` } : undefined}>
              {showImage && (
                <img
                  src={url}
                  alt={`${char.name} ${p.action}`}
                  className="popup-art"
                  onError={() => setImgOk((s) => ({ ...s, [p.id]: false }))}
                  onLoad={(e) => {
                    const el = e.currentTarget
                    const w = el.naturalWidth
                    const h = el.naturalHeight
                    if (w > 0 && h > 0) {
                      setImgRatio((s) => (s[p.id] === w / h ? s : { ...s, [p.id]: w / h }))
                    }
                  }}
                />
              )}
              {imgOk[p.id] === false && (
                <div
                  className="popup-art-fallback"
                  style={{ background: char.palette.primary }}
                >
                  <div
                    className="popup-art-fallback-inner"
                    style={{ color: char.palette.secondary }}
                  >
                    <span className="popup-fallback-name">{char.name}</span>
                    <span className="popup-fallback-arch">{char.archetype}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="popup-caption">
              <div className="popup-name" style={{ color: char.palette.accent }}>
                {char.name}
              </div>
              {ACTION_LABEL[p.action] && (
                <div className="popup-action">{ACTION_LABEL[p.action]}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
