import { useGameStore } from '../store/gameStore'
import { getCharacter } from '../characters/roster'
import { MATCH } from '../physics/constants'
import { Brain, Crosshair, Loader, Rocket } from 'lucide-react'
import './TurnIndicator.css'

const PHASE_LABEL: Record<string, { text: string; icon: typeof Brain }> = {
  intro: { text: 'Get Ready', icon: Loader },
  player_aim: { text: 'Your Turn — Aim', icon: Crosshair },
  player_power: { text: 'Your Turn — Power', icon: Crosshair },
  launching: { text: 'In Flight', icon: Rocket },
  resolving: { text: 'Resolving', icon: Loader },
  ai_thinking: { text: 'Opponent Thinking', icon: Brain },
  defeat: { text: 'Match Over', icon: Loader },
}

export function TurnIndicator() {
  const phase = useGameStore((s) => s.phase)
  const currentTurn = useGameStore((s) => s.currentTurn)
  const round = useGameStore((s) => s.round)
  const playerCharId = useGameStore((s) => s.playerCharId)
  const aiCharId = useGameStore((s) => s.aiCharId)

  const playerChar = getCharacter(playerCharId)
  const aiChar = getCharacter(aiCharId)
  const meta = PHASE_LABEL[phase] ?? { text: phase, icon: Loader }
  const Icon = meta.icon

  return (
    <div className="turn-indicator">
      <div className="turn-plate turn-plate--ai">
        <span className="turn-name turn-name--cyan">{aiChar.name}</span>
        <span className="turn-archetype">{aiChar.archetype}</span>
      </div>

      <div className="turn-vs">
        <span>Round</span>
        <span>{round}/{MATCH.maxRounds}</span>
      </div>

      <div className="turn-plate turn-plate--player">
        <span className="turn-name">{playerChar.name}</span>
        <span className="turn-archetype">{playerChar.archetype}</span>
      </div>

      <div className={`turn-phase-pill ${currentTurn === 'player' ? 'is-player' : 'is-ai'}`}>
        <Icon size={14} className={phase === 'intro' || phase === 'resolving' || phase === 'ai_thinking' ? 'spin' : ''} />
        <span>{meta.text}</span>
      </div>
    </div>
  )
}
