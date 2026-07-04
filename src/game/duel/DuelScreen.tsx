import { useEffect } from 'react'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { useDuelStore } from './duelStore'
import { DUEL, landingGrade } from './duelConstants'
import { computeAiThrow } from './duelAI'
import { playSlam } from './slamSound'
import { DuelScene } from './DuelScene'
import { FlickInput } from './FlickInput'
import './DuelScreen.css'

export function DuelScreen() {
  const backToMenu = useGameStore((s) => s.backToMenu)
  const phase = useDuelStore((s) => s.phase)
  const currentTurn = useDuelStore((s) => s.currentTurn)
  const throwCount = useDuelStore((s) => s.throwCount)
  const lastThrow = useDuelStore((s) => s.lastThrow)
  const winner = useDuelStore((s) => s.winner)
  const winReason = useDuelStore((s) => s.winReason)
  const playerChipsWon = useDuelStore((s) => s.playerChipsWon)
  const aiChipsWon = useDuelStore((s) => s.aiChipsWon)
  const slam = useDuelStore((s) => s.slam)
  const aiThrow = useDuelStore((s) => s.aiThrow)
  const nextDuel = useDuelStore((s) => s.nextDuel)

  // Rival takes its turn after a "thinking" delay
  useEffect(() => {
    if (phase !== 'ai_think') return
    const timer = setTimeout(() => aiThrow(computeAiThrow()), DUEL.aiThinkMs)
    return () => clearTimeout(timer)
  }, [phase, aiThrow])

  // Slam clack (synth placeholder)
  useEffect(() => {
    if (slam) playSlam(slam.strength)
  }, [slam?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // R = next duel (only once decided), Esc = back to menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && useDuelStore.getState().phase === 'gameover')
        nextDuel()
      if (e.key === 'Escape') backToMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nextDuel, backToMenu])

  // Leave the duel clean when exiting to menu
  useEffect(() => () => nextDuel(), [nextDuel])

  const turnLabel =
    phase === 'gameover'
      ? winner === 'player'
        ? 'YOU WIN'
        : winner === 'ai'
        ? 'YOU LOSE'
        : 'DRAW'
      : phase === 'flight'
      ? '...'
      : currentTurn === 'player'
      ? 'YOUR TURN — hold, then flick forward to slam'
      : 'RIVAL IS LINING UP...'

  const reasonText = (() => {
    if (!winReason) return ''
    switch (winReason) {
      case 'flip':
        return winner === 'player'
          ? "You flipped the rival's chip — it's yours now!"
          : 'Your chip got flipped — the rival pockets it.'
      case 'self-flip':
        return winner === 'player'
          ? 'The rival flipped their own chip. Free chip!'
          : 'Your own chip landed face-down. It belongs to the rival now.'
      case 'out-of-bounds':
        return winner === 'player'
          ? 'The rival threw their chip out of the circle. You keep it!'
          : 'Your chip flew out of the circle. Forfeited!'
      case 'ring-out':
        return winner === 'player'
          ? "You shoved the rival's chip out of the ring. Win — but no capture."
          : 'Your chip was shoved out of the ring. Loss — but you keep it.'
      case 'draw':
        return 'Out of throws. Both chips walk away.'
    }
  })()

  return (
    <div className="duel-screen">
      <DuelScene />
      {currentTurn === 'player' && phase === 'ready' && <FlickInput />}

      <div className="duel-hud duel-hud--top">
        <button className="duel-back" onClick={backToMenu}>
          <ArrowLeft size={16} /> Menu
        </button>
        <div className="duel-title">
          <h1>DUEL PROTOTYPE</h1>
          <p>{turnLabel}</p>
        </div>
        <div className="duel-tally">
          <span className="duel-tally__you">YOU {playerChipsWon}</span>
          <span className="duel-tally__sep">–</span>
          <span className="duel-tally__rival">{aiChipsWon} RIVAL</span>
          <span className="duel-tally__throws">
            throw {Math.min(throwCount + (phase === 'gameover' ? 0 : 1), DUEL.maxThrows)}/{DUEL.maxThrows}
          </span>
        </div>
      </div>

      {lastThrow && phase !== 'gameover' && (
        <div className="duel-hud duel-hud--stats">
          <div className="duel-stat">
            <span className="duel-stat__label">{lastThrow.attacker === 'player' ? 'You' : 'Rival'}</span>
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
        </div>
      )}

      {phase === 'gameover' && (
        <div className="duel-gameover">
          <h2
            className={
              winner === 'player'
                ? 'duel-gameover__title duel-gameover__title--win'
                : winner === 'ai'
                ? 'duel-gameover__title duel-gameover__title--lose'
                : 'duel-gameover__title'
            }
          >
            {turnLabel}
          </h2>
          <p className="duel-gameover__reason">{reasonText}</p>
          <button className="btn duel-gameover__btn" onClick={nextDuel}>
            <RotateCcw size={16} /> Next Duel (R)
          </button>
        </div>
      )}
    </div>
  )
}
