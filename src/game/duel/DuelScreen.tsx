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
  const chips = useDuelStore((s) => s.chips)
  const lastThrow = useDuelStore((s) => s.lastThrow)
  const winner = useDuelStore((s) => s.winner)
  const winReason = useDuelStore((s) => s.winReason)
  const playerCaptured = useDuelStore((s) => s.playerCaptured)
  const aiCaptured = useDuelStore((s) => s.aiCaptured)
  const playerChipsWon = useDuelStore((s) => s.playerChipsWon)
  const aiChipsWon = useDuelStore((s) => s.aiChipsWon)
  const slam = useDuelStore((s) => s.slam)
  const lockedAim = useDuelStore((s) => s.lockedAim)
  const playerStance = useDuelStore((s) => s.playerStance)
  const setPlayerStance = useDuelStore((s) => s.setPlayerStance)
  const aiThrow = useDuelStore((s) => s.aiThrow)
  const nextDuel = useDuelStore((s) => s.nextDuel)

  const stackOf = (side: 'player' | 'ai') =>
    chips.filter((c) => c.side === side && c.status === 'stack').length

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

  // R = next duel (once decided), Esc = menu, A/D or arrows = stance
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useDuelStore.getState()
      if ((e.key === 'r' || e.key === 'R') && st.phase === 'gameover') nextDuel()
      if (e.key === 'Escape') backToMenu()
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')
        st.setPlayerStance(st.playerStance - DUEL.stanceKeyStep)
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight')
        st.setPlayerStance(st.playerStance + DUEL.stanceKeyStep)
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
      ? lockedAim
        ? 'Target locked — flick forward to slam! (tap again to re-aim)'
        : 'YOUR TURN — move with A/D, tap the ground to set your target'
      : 'RIVAL IS LINING UP...'

  const reasonText = (() => {
    switch (winReason) {
      case 'wipeout':
        return winner === 'player'
          ? 'The rival has nothing left to play. Total victory!'
          : 'You have no chips left. Cleaned out!'
      case 'captures':
        return `Chips taken: you ${playerCaptured} — ${aiCaptured} rival.`
      case 'draw':
        return `Even take (${playerCaptured}–${aiCaptured}). Both walk away.`
      default:
        return ''
    }
  })()

  // Power grade: how well the flick speed matched what the aim required
  const powerPct =
    lastThrow &&
    Math.round(
      100 - Math.min(100, (Math.abs(lastThrow.speed - lastThrow.requiredSpeed) / lastThrow.requiredSpeed) * 100)
    )

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
          <span className="duel-tally__you">
            YOU ×{stackOf('player')} · took {playerCaptured}
          </span>
          <span className="duel-tally__sep">|</span>
          <span className="duel-tally__rival">
            RIVAL ×{stackOf('ai')} · took {aiCaptured}
          </span>
          <span className="duel-tally__throws">
            session {playerChipsWon}–{aiChipsWon}
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
            <span className="duel-stat__label">Power</span>
            <span className="duel-stat__value">{powerPct}%</span>
          </div>
          <div className={`duel-stat duel-stat--grade duel-stat--${landingGrade(lastThrow.straightness).toLowerCase()}`}>
            <span className="duel-stat__label">Snap</span>
            <span className="duel-stat__value">{landingGrade(lastThrow.straightness)}</span>
          </div>
        </div>
      )}

      {currentTurn === 'player' && phase === 'ready' && (
        <div className="duel-stance">
          <span className="duel-stance__label">STANCE</span>
          <input
            type="range"
            min={-DUEL.stanceMaxRad}
            max={DUEL.stanceMaxRad}
            step={0.02}
            value={playerStance}
            onChange={(e) => setPlayerStance(parseFloat(e.target.value))}
          />
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
