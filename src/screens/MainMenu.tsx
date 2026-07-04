import { useState } from 'react'
import { useGameStore } from '../game/store/gameStore'
import { useDuelStore } from '../game/duel/duelStore'
import { Info, Play, Zap, Archive } from 'lucide-react'
import './MainMenu.css'

// World Board dossier language: dark panel, thin rules, amber section
// labels, tag chips — see docs/ART_DIRECTION.md and src/art/World Board.jpg.
export function MainMenu() {
  const goToSelect = useGameStore((s) => s.goToSelect)
  const goToDuel = useGameStore((s) => s.goToDuel)
  const [showHowTo, setShowHowTo] = useState(false)

  return (
    <div
      className="dossier"
      style={{
        backgroundImage: `linear-gradient(rgba(16,14,20,0.55), rgba(16,14,20,0.9)), url(${import.meta.env.BASE_URL}art/menu-keyart.jpg)`,
      }}
    >
      <div className="dossier__panel">
        <span className="dossier__label">STATE DOSSIER · RECOVERED SPECIMEN FILE</span>
        <h1 className="dossier__title">POGGERS</h1>
        <p className="dossier__sub">
          Year 30XX. Eleven proxy wars. One rule left: conflict is settled by
          POG. You were frozen in 2008 — and you remember how they made the
          caps.
        </p>
        <div className="dossier__tags">
          <span>YEAR 30XX</span>
          <span>POG ARBITRATION</span>
          <span>11 PROXY WARS</span>
          <span>LOST ARTS</span>
        </div>

        <div className="dossier__actions">
          <button
            className="dossier__btn dossier__btn--primary"
            onClick={() => {
              useDuelStore.getState().startStory()
              goToDuel()
            }}
          >
            <Play size={16} /> STORY MODE
          </button>
          <button
            className="dossier__btn"
            onClick={() => {
              useDuelStore.getState().startFreePlay()
              goToDuel()
            }}
          >
            <Zap size={16} /> FREE DUEL
          </button>
          <button className="dossier__btn dossier__btn--ghost" onClick={() => setShowHowTo(true)}>
            <Info size={16} /> HOW TO PLAY
          </button>
          <button className="dossier__btn dossier__btn--ghost" onClick={goToSelect}>
            <Archive size={16} /> LEGACY ARENA
          </button>
        </div>

        <span className="dossier__footnote">
          Public ideology frames pog as civilized restraint. Ratio 1:10 · few
          elderly · the weigh-in applies to citizens.
        </span>
      </div>

      {showHowTo && (
        <div className="howto-modal" onClick={() => setShowHowTo(false)}>
          <div className="howto-card" onClick={(e) => e.stopPropagation()}>
            <h2>How to Play</h2>
            <ol>
              <li><strong>Move</strong> along your arc with A/D, then <strong>tap the ground</strong> to lock your target.</li>
              <li><strong>Flick forward to slam.</strong> Flick speed is your power — match the distance. A straight snap lands flat; flat landings blast the strongest gust.</li>
              <li>Land <em>beside</em> a chip (a small gap) to flip it — face-down chips are <strong>captured, for keeps</strong>. Land on top to pin it. Outside the ring is lost.</li>
              <li>Between duels, <strong>burn 🔥 or paint ⬜</strong> your chips at the bench. Every mod is a trade-off.</li>
            </ol>
            <button className="dossier__btn dossier__btn--primary" onClick={() => setShowHowTo(false)}>
              UNDERSTOOD
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
