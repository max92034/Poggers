import { useState } from 'react'
import { useGameStore } from '../game/store/gameStore'
import { Info, Play } from 'lucide-react'
import './MainMenu.css'

export function MainMenu() {
  const goToSelect = useGameStore((s) => s.goToSelect)
  const [showHowTo, setShowHowTo] = useState(false)

  return (
    <div className="main-menu">
      <div className="main-menu__glow" />
      <div className="main-menu__disc" />
      <span className="main-menu__version" aria-hidden="true">v2.30</span>

      <div className="main-menu__content">
        <h1 className="main-menu__title">Poggers</h1>
        <p className="main-menu__subtitle">Neo-Arcade Combat Arena</p>

        <button className="btn main-menu__btn" onClick={goToSelect}>
          <Play size={18} /> Enter Arena
        </button>
        <button
          className="btn-secondary main-menu__btn main-menu__btn--secondary"
          onClick={() => setShowHowTo(true)}
        >
          <Info size={18} /> How to Play
        </button>
      </div>

      {showHowTo && (
        <div className="howto-modal" onClick={() => setShowHowTo(false)}>
          <div className="howto-card" onClick={(e) => e.stopPropagation()}>
            <h2>How to Play</h2>
            <ol>
              <li>Pick one of three characters. Each has unique stats that change how their slammer flies, bounces, and scatters the stack.</li>
              <li>On your turn, <strong>aim</strong> with the slider, then click <em>Lock Aim</em>.</li>
              <li>Watch the <strong>power meter</strong> oscillate. Click <em>Launch</em> at your desired power (higher = stronger, but the meter moves faster for low-control characters).</li>
              <li>Any pog that flips face-down is collected by the attacker. Flip the opponent's <strong>main pog</strong> (the big one on their side) for an instant win.</li>
              <li>After 5 rounds, whoever collected the most stack pogs wins.</li>
            </ol>
            <button className="btn" onClick={() => setShowHowTo(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  )
}
