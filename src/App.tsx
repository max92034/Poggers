import { useEffect } from 'react'
import { useGameStore } from './game/store/gameStore'
import { MainMenu } from './screens/MainMenu'
import { CharacterSelect } from './screens/CharacterSelect'
import { ResultScreen } from './screens/ResultScreen'
import { ArenaScene } from './game/scenes/ArenaScene'
import { AimPower } from './game/ui/AimPower'
import { TurnIndicator } from './game/ui/TurnIndicator'
import { Scoreboard } from './game/ui/Scoreboard'
import { PopupLayer } from './game/ui/PopupLayer'
import { DevMenu } from './game/ui/DevMenu'

function GameScreen() {
  const playerCharId = useGameStore((s) => s.playerCharId)
  const aiCharId = useGameStore((s) => s.aiCharId)

  return (
    <div className="game-screen">
      <ArenaScene playerCharId={playerCharId} aiCharId={aiCharId} />
      <TurnIndicator />
      <Scoreboard />
      <AimPower />
      <PopupLayer />
      <div className="dev-menu-wrapper">
        <DevMenu />
      </div>
    </div>
  )
}

export default function App() {
  const screen = useGameStore((s) => s.screen)
  const phase = useGameStore((s) => s.phase)
  const popups = useGameStore((s) => s.popups)

  // Transition: when defeat popups are all dismissed, go to result screen.
  useEffect(() => {
    if (screen === 'game' && phase === 'defeat' && popups.length === 0) {
      useGameStore.setState({ screen: 'result' })
    }
  }, [screen, phase, popups])

  return (
    <div className="app-shell">
      {screen === 'menu' && <MainMenu />}
      {screen === 'select' && <CharacterSelect />}
      {screen === 'game' && <GameScreen />}
      {screen === 'result' && <ResultScreen />}
    </div>
  )
}
