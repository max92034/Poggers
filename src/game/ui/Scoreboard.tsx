import { useGameStore } from '../store/gameStore'
import { getCharacter } from '../characters/roster'
import { ARENA } from '../physics/constants'
import './Scoreboard.css'

/**
 * Side score panels showing pog-icon count per side.
 * Score = number of neutral stack pogs flipped by that side.
 * Each side can collect up to ARENA.stackCount pogs over the match.
 */
export function Scoreboard() {
  const playerScore = useGameStore((s) => s.playerScore)
  const aiScore = useGameStore((s) => s.aiScore)
  const playerCharId = useGameStore((s) => s.playerCharId)
  const aiCharId = useGameStore((s) => s.aiCharId)

  const playerChar = getCharacter(playerCharId)
  const aiChar = getCharacter(aiCharId)

  return (
    <>
      <div className="scoreboard scoreboard-player">
        <div className="score-portrait" style={{ background: playerChar.palette.primary }}>
          <img
            src={`/art/${playerChar.id}-pog.png`}
            alt={playerChar.name}
            onError={(e) => { (e.currentTarget.style.display = 'none') }}
          />
        </div>
        <div className="score-info">
          <div className="score-label">You</div>
          <div className="score-value">{playerScore}<span className="score-max">/{ARENA.stackCount}</span></div>
        </div>
      </div>

      <div className="scoreboard scoreboard-ai">
        <div className="score-portrait" style={{ background: aiChar.palette.primary }}>
          <img
            src={`/art/${aiChar.id}-pog.png`}
            alt={aiChar.name}
            onError={(e) => { (e.currentTarget.style.display = 'none') }}
          />
        </div>
        <div className="score-info">
          <div className="score-label">CPU</div>
          <div className="score-value">{aiScore}<span className="score-max">/{ARENA.stackCount}</span></div>
        </div>
      </div>
    </>
  )
}
