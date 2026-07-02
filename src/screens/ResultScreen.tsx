import { useEffect, useState } from 'react'
import { useGameStore } from '../game/store/gameStore'
import { getCharacter } from '../game/characters/roster'
import { pogTextureUrl } from '../art/assets'
import { Home, RotateCcw } from 'lucide-react'
import './ResultScreen.css'

export function ResultScreen() {
  const winner = useGameStore((s) => s.winner)
  const playerCharId = useGameStore((s) => s.playerCharId)
  const aiCharId = useGameStore((s) => s.aiCharId)
  const playerScore = useGameStore((s) => s.playerScore)
  const aiScore = useGameStore((s) => s.aiScore)
  const playAgain = useGameStore((s) => s.playAgain)
  const backToMenu = useGameStore((s) => s.backToMenu)

  const playerChar = getCharacter(playerCharId)
  const aiChar = getCharacter(aiCharId)
  const playerWon = winner === 'player'

  const [imgOk, setImgOk] = useState<Record<string, boolean>>({})
  useEffect(() => {
    ;[playerCharId, aiCharId].forEach((id) => {
      const img = new Image()
      img.src = pogTextureUrl(id)
      img.onload = () => setImgOk((s) => ({ ...s, [id]: true }))
      img.onerror = () => setImgOk((s) => ({ ...s, [id]: false }))
    })
  }, [playerCharId, aiCharId])

  return (
    <div className={`result-screen ${playerWon ? 'is-win' : 'is-lose'}`}>
      <div className="result-glow" />
      <div className="result-content">
        <h1 className="result-headline">
          {playerWon ? 'Victory' : 'Defeat'}
        </h1>
        <p className="result-subtitle">
          {playerWon ? 'You flipped the most pogs.' : 'Better luck next match.'}
        </p>

        <div className="result-score-row">
          <div className="result-side result-side-player">
            <div className="result-portrait" style={{ background: playerChar.palette.primary }}>
              {imgOk[playerCharId] !== false && (
                <img
                  src={pogTextureUrl(playerCharId)}
                  alt={playerChar.name}
                  onError={() => setImgOk((s) => ({ ...s, [playerCharId]: false }))}
                />
              )}
            </div>
            <div className="result-side-name">{playerChar.name}</div>
            <div className="result-side-score">{playerScore}</div>
          </div>

          <div className="result-vs">vs</div>

          <div className="result-side result-side-ai">
            <div className="result-portrait" style={{ background: aiChar.palette.primary }}>
              {imgOk[aiCharId] !== false && (
                <img
                  src={pogTextureUrl(aiCharId)}
                  alt={aiChar.name}
                  onError={() => setImgOk((s) => ({ ...s, [aiCharId]: false }))}
                />
              )}
            </div>
            <div className="result-side-name">{aiChar.name}</div>
            <div className="result-side-score">{aiScore}</div>
          </div>
        </div>

        <div className="result-actions">
          <button className="btn result-play-again" onClick={playAgain}>
            <RotateCcw size={18} /> Play Again
          </button>
          <button className="btn btn-secondary" onClick={backToMenu}>
            <Home size={18} /> Main Menu
          </button>
        </div>
      </div>
    </div>
  )
}
