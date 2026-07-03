import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getCharacter } from '../characters/roster'
import { STAT_PHYSICS } from '../physics/constants'
import './AimPower.css'

/**
 * Bottom-of-screen overlay that handles the aim + power input flow.
 * - During 'player_aim': horizontal angle slider + "Lock Aim" button.
 * - During 'player_power': oscillating power bar + "Launch" button.
 * Hidden during all other phases.
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
  useEffect(() => {
    if (phase !== 'player_power') return
    const speed = STAT_PHYSICS.powerMeterSpeed(playerChar.stats.control)
    const startTime = performance.now()
    let mounted = true
    const tick = (now: number) => {
      if (!mounted) return
      const t = (now - startTime) / 1000
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
  const aimPercent = ((angleDeg + maxDeg) / (maxDeg * 2)) * 100

  return (
    <div className="aim-power">
      {phase === 'player_aim' && (
        <div className="aim-row">
          <div className="aim-row__label">Aim</div>
          <div className="aim-row__control">
            <div className="slider-track">
              <div className="slider-track__center" />
              <div
                className="slider-track__thumb"
                style={{ left: `${Math.min(Math.max(aimPercent, 0), 100)}%` }}
              />
              <input
                className="aim-slider"
                type="range"
                min={-maxDeg}
                max={maxDeg}
                step={1}
                value={angleDeg}
                onChange={(e) => setAim((parseFloat(e.target.value) * Math.PI) / 180)}
              />
            </div>
            <div className="slider-labels">
              <span>-{maxDeg.toFixed(0)}°</span>
              <span>0°</span>
              <span>+{maxDeg.toFixed(0)}°</span>
            </div>
          </div>
          <button className="btn-lock" onClick={enterPowerPhase}>Lock</button>
        </div>
      )}

      {phase === 'player_power' && (
        <div className="aim-row">
          <div className="aim-row__label">Power</div>
          <div className="aim-row__control">
            <div className="power-bar">
              <div className="power-bar__fill" style={{ width: `${livePower}%` }} />
              <div className="power-bar__sweetspot" style={{ left: '85%', width: '10%' }} />
              {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
                <div
                  key={pct}
                  className="power-bar__segment"
                  style={{ left: `${pct}%` }}
                />
              ))}
            </div>
            <div className="power-value">{livePower.toFixed(0)}%</div>
          </div>
          <button className="btn-launch" onClick={() => lockPower(livePower)}>Launch</button>
        </div>
      )}
    </div>
  )
}
