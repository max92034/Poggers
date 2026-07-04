import { useEffect } from 'react'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { useDuelStore } from './duelStore'
import { landingGrade } from './duelConstants'
import { DuelScene } from './DuelScene'
import { FlickInput } from './FlickInput'
import './DuelScreen.css'

export function DuelScreen() {
  const backToMenu = useGameStore((s) => s.backToMenu)
  const phase = useDuelStore((s) => s.phase)
  const lastThrow = useDuelStore((s) => s.lastThrow)
  const defenderFlipped = useDuelStore((s) => s.defenderFlipped)
  const attackerFlipped = useDuelStore((s) => s.attackerFlipped)
  const resetDuel = useDuelStore((s) => s.resetDuel)

  // R = throw again, Esc = back to menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') resetDuel()
      if (e.key === 'Escape') backToMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resetDuel, backToMenu])

  // Leave the duel in a clean state when exiting to menu
  useEffect(() => () => resetDuel(), [resetDuel])

  return (
    <div className="duel-screen">
      <DuelScene />
      <FlickInput />

      <div className="duel-hud duel-hud--top">
        <button className="duel-back" onClick={backToMenu}>
          <ArrowLeft size={16} /> Menu
        </button>
        <div className="duel-title">
          <h1>DUEL PROTOTYPE</h1>
          <p>
            {phase === 'ready'
              ? 'Hold, then flick forward to slam your chip'
              : phase === 'flight'
              ? '...'
              : 'Press R to throw again'}
          </p>
        </div>
        <div className="duel-hud__spacer" />
      </div>

      {lastThrow && (
        <div className="duel-hud duel-hud--stats">
          <div className="duel-stat">
            <span className="duel-stat__label">Speed</span>
            <span className="duel-stat__value">{lastThrow.speed.toFixed(1)} m/s</span>
          </div>
          <div className="duel-stat">
            <span className="duel-stat__label">Snap</span>
            <span className="duel-stat__value">
              {Math.round(lastThrow.straightness * 100)}%
            </span>
          </div>
          <div className={`duel-stat duel-stat--grade duel-stat--${landingGrade(lastThrow.straightness).toLowerCase()}`}>
            <span className="duel-stat__label">Landing</span>
            <span className="duel-stat__value">{landingGrade(lastThrow.straightness)}</span>
          </div>
          {phase === 'settled' && (
            <div className="duel-stat duel-stat--result">
              <span className="duel-stat__label">Result</span>
              <span className="duel-stat__value">
                {defenderFlipped
                  ? 'FLIPPED! 🎉'
                  : attackerFlipped
                  ? 'SELF-FLIP 💀'
                  : 'no flip'}
              </span>
            </div>
          )}
        </div>
      )}

      {phase === 'settled' && (
        <button className="btn duel-reset" onClick={resetDuel}>
          <RotateCcw size={16} /> Throw Again (R)
        </button>
      )}
    </div>
  )
}
