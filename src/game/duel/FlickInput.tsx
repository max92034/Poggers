import { useRef, useCallback } from 'react'
import { useDuelStore } from './duelStore'
import { DUEL } from './duelConstants'
import './FlickInput.css'

interface Sample {
  x: number
  y: number
  t: number
}

/**
 * Full-screen pointer overlay that turns a flick gesture into a throw.
 *
 * The flick IS the wrist snap: pointer velocity at release sets launch speed,
 * screen direction sets world direction (up = away from the player), and how
 * straight the gesture was sets landing flatness. Pointer events cover mouse,
 * touch, and pen with one code path.
 */
export function FlickInput() {
  const phase = useDuelStore((s) => s.phase)
  const throwChip = useDuelStore((s) => s.throwChip)

  const samplesRef = useRef<Sample[]>([])
  const activeRef = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    activeRef.current = true
    samplesRef.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }]
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeRef.current) return
    samplesRef.current.push({ x: e.clientX, y: e.clientY, t: performance.now() })
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!activeRef.current) return
      activeRef.current = false
      const samples = samplesRef.current
      samples.push({ x: e.clientX, y: e.clientY, t: performance.now() })
      samplesRef.current = []

      if (import.meta.env.DEV) console.debug('[flick] samples:', samples.length)
      const first = samples[0]
      const last = samples[samples.length - 1]
      const totalDx = last.x - first.x
      const totalDy = last.y - first.y
      const totalDist = Math.hypot(totalDx, totalDy)
      if (totalDist < DUEL.minFlickDistPx) return // a tap, not a throw

      // Release velocity: measured over the trailing window so a slow
      // wind-up followed by a sharp snap still reads as a fast throw.
      const windowStart = last.t - DUEL.flickWindowMs
      let wi = samples.findIndex((s) => s.t >= windowStart)
      if (wi < 0 || wi >= samples.length - 1) wi = Math.max(0, samples.length - 2)
      const w0 = samples[wi]
      let dt = Math.max(1, last.t - w0.t) // ms
      let wdx = last.x - w0.x
      let wdy = last.y - w0.y
      // Degenerate window (pointer paused before release, or coarse event
      // timing): fall back to the whole gesture chord so the throw still fires.
      if (Math.hypot(wdx, wdy) < 8) {
        wdx = totalDx
        wdy = totalDy
        dt = Math.max(1, last.t - first.t)
      }
      const pxPerMs = Math.hypot(wdx, wdy) / dt

      // Straightness: worst perpendicular deviation of the path from the
      // start→end chord, normalized by chord length. A clean snap ≈ 1.
      let maxDev = 0
      const nx = -totalDy / totalDist // chord normal
      const ny = totalDx / totalDist
      for (const s of samples) {
        const dev = Math.abs((s.x - first.x) * nx + (s.y - first.y) * ny)
        if (dev > maxDev) maxDev = dev
      }
      const straightness = Math.max(0, Math.min(1, 1 - (maxDev / totalDist) * 2.5))

      // Screen → world: screen-up is away from the player (world -Z),
      // screen-right is world +X. Use the release-window direction so the
      // throw goes where the snap pointed, not where the wind-up started.
      const dirLen = Math.hypot(wdx, wdy)
      if (dirLen < 1) return
      const dirX = wdx / dirLen
      const dirZ = wdy / dirLen // screen down (+y) = toward player (+z)
      if (dirZ > -0.15) return // require a mostly-forward flick

      const speed = Math.max(
        DUEL.minSpeed,
        Math.min(DUEL.maxSpeed, pxPerMs * DUEL.pxPerMsToSpeed)
      )

      if (import.meta.env.DEV)
        console.debug('[flick] throw:', { pxPerMs, speed, straightness, dirX, dirZ })
      throwChip({ dirX, dirZ, speed, straightness })
    },
    [throwChip]
  )

  if (phase !== 'ready') return null

  return (
    <div
      className="flick-input"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        activeRef.current = false
        samplesRef.current = []
      }}
    />
  )
}
