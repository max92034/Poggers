import { useEffect, useState } from 'react'
import { useGameStore } from '../game/store/gameStore'
import { ROSTER, getCharacter } from '../game/characters/roster'
import { STAT_KEYS, STAT_LABELS } from '../game/characters/types'
import { ArrowLeft, Check } from 'lucide-react'
import { pogTextureUrl } from '../art/assets'
import './CharacterSelect.css'

export function CharacterSelect() {
  const startMatch = useGameStore((s) => s.startMatch)
  const backToMenu = useGameStore((s) => s.backToMenu)
  const [selected, setSelected] = useState<string | null>(null)
  const [imgOk, setImgOk] = useState<Record<string, boolean>>({})

  // Randomly pick an AI opponent (different from player's choice) when starting
  const handleStart = () => {
    if (!selected) return
    const others = ROSTER.filter((c) => c.id !== selected)
    const ai = others[Math.floor(Math.random() * others.length)]
    startMatch(selected, ai.id)
  }

  // Preload portrait images to know which ones loaded successfully
  useEffect(() => {
    ROSTER.forEach((c) => {
      const img = new Image()
      img.src = pogTextureUrl(c.id)
      img.onload = () => setImgOk((s) => ({ ...s, [c.id]: true }))
      img.onerror = () => setImgOk((s) => ({ ...s, [c.id]: false }))
    })
  }, [])

  return (
    <div className="char-select">
      <header className="cs-header">
        <button className="cs-back" onClick={backToMenu} aria-label="Back to menu">
          <ArrowLeft size={20} />
        </button>
        <h1 className="cs-title">Choose your fighter</h1>
        <div className="cs-back" style={{ visibility: 'hidden' }}><ArrowLeft size={20} /></div>
      </header>

      <div className="cs-cards">
        {ROSTER.map((c) => {
          const isSelected = selected === c.id
          return (
            <button
              key={c.id}
              className={`cs-card ${isSelected ? 'is-selected' : ''}`}
              onClick={() => setSelected(c.id)}
              style={{
                '--card-primary': c.palette.primary,
                '--card-secondary': c.palette.secondary,
                '--card-accent': c.palette.accent,
              } as React.CSSProperties}
            >
              <div className="cs-portrait" style={{ background: c.palette.primary }}>
                {imgOk[c.id] === false ? (
                  <span className="cs-portrait-fallback" style={{ color: c.palette.secondary }}>
                    {c.name}
                  </span>
                ) : (
                  <img
                    src={pogTextureUrl(c.id)}
                    alt={c.name}
                    onError={() => setImgOk((s) => ({ ...s, [c.id]: false }))}
                  />
                )}
              </div>
              <div className="cs-info">
                <div className="cs-name-row">
                  <h2 className="cs-name">{c.name}</h2>
                  <span className="cs-element" data-element={c.element}>{c.element}</span>
                </div>
                <div className="cs-archetype">{c.archetype}</div>
                <div className="cs-stats">
                  {STAT_KEYS.map((k) => (
                    <div key={k} className="cs-stat">
                      <span className="cs-stat-label">{STAT_LABELS[k]}</span>
                      <div className="cs-stat-bar">
                        <div
                          className="cs-stat-fill"
                          style={{ width: `${(c.stats[k] / 10) * 100}%`, background: c.palette.accent }}
                        />
                      </div>
                      <span className="cs-stat-value">{c.stats[k]}</span>
                    </div>
                  ))}
                </div>
                <p className="cs-tagline">{c.tagline}</p>
              </div>
              {isSelected && (
                <div className="cs-check"><Check size={18} /></div>
              )}
            </button>
          )
        })}
      </div>

      <footer className="cs-footer">
        <span className="cs-selected-label">
          {selected ? `Selected: ${getCharacter(selected).name}` : 'Select a character'}
        </span>
        <button className="btn cs-start" disabled={!selected} onClick={handleStart}>
          Start Match
        </button>
      </footer>
    </div>
  )
}
