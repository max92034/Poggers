import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getCharacter } from '../characters/roster'
import { STAT_PHYSICS } from '../physics/constants'
import './AimPower.css'

/**
 * Bottom-of-screen overlay that handles the aim + power input flow.
 * - During 'player_aim': horizontal angle slider + "Lock Aim" button.
 * - During 'player_power': oscillating power bar + "Launch" button.
 * - Hidden during all other phases.
 *
 * Per user pref: single primary action button (no redundant buttons),
 * controls accessible at bottom of screen for mobile.
 */
export function AimPower() {
  const phase = useGameStore((s) => s.phase)
  const playerCharId = useGameStore((s) => s.playerCharId)
  const aimAngle = useGameStore((s) => s.aimAngle)
  const setAim = useGameStore((s) => s.setAim)
  const enterPowerPhase = useGameStore((s) => s.enterPowerPhase)
  const lockPower = useGameStore((s) => s.lockPower)

  const playerChar = getCharacter(playerCharId)
  const [livePower, setLivePower] = useState(0)
  const rafRef = useRef<number | null>(null)

  // Oscillate power during player_power phase.
  // Higher control stat → slower oscillation → easier to time.
  useEffect(() => {
    if (phase !== 'player_power') return
    const speed = STAT_PHYSICS.powerMeterSpeed(playerChar.stats.control)
    const startTime = performance.now()
    let mounted = true
    const tick = (now: number) => {
      if (!mounted) return
      const t = (now - startTime) / 1000
      // Sine wave from 0 to 100, starting at 0
      const v = (Math.sin(t * speed - Math.PI / 2) + 1) / 2 * 100
      setLivePower(v)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      mounted = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [phase, playerChar.stats.control])

  if (phase !== 'player_aim' && phase !== 'player_power') return null

  const angleDeg = (aimAngle * 180) / Math.PI
  const maxDeg = (STAT_PHYSICS.aimRangeRad * 180) / Math.PI

  return (
    <div className="aim-power">
      {phase === 'player_aim' && (
        <div className="aim-row">
          <div className="aim-label">
            <span className="aim-title">Aim</span>
            <span className="aim-value">{angleDeg > 0 ? '+' : ''}{angleDeg.toFixed(0)}°</span>
          </div>
          <input
            className="aim-slider"
            type="range"
            min={-maxDeg}
            max={maxDeg}
            step={1}
            value={angleDeg}
            onChange={(e) => setAim((parseFloat(e.target.value) * Math.PI) / 180)}
          />
          <button className="btn" onClick={enterPowerPhase}>Lock Aim</button>
        </div>
      )}

      {phase === 'player_power' && (
        <div className="power-row">
          <div className="power-label">
            <span className="aim-title">Power</span>
            <span className="aim-value">{livePower.toFixed(0)}%</span>
          </div>
          <div className="power-bar">
            <div className="power-fill" style={{ width: `${livePower}%` }} />
            <div className="power-sweet-spot" style={{ left: '85%', width: '10%' }} />
          </div>
          <button className="btn" onClick={() => lockPower(livePower)}>Launch</button>
        </div>
      )}
    </div>
  )
}
