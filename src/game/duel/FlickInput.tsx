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
 * Aim-then-snap input overlay.
 *
 * Hovering moves the ground reticle (via pointer NDC → AimReticle raycast).
 * Holding + flicking executes the throw: flick speed is your power (graded
 * against the ballistic speed the aim point requires — too soft lands
 * short, too hard overshoots), flick straightness is your landing quality.
 * Direction comes from the AIM POINT, not the gesture, so intent and
 * execution are separate skills.
 */
export function FlickInput() {
  const throwChip = useDuelStore((s) => s.throwChip)
  const lockAim = useDuelStore((s) => s.lockAim)
  const setPointerNdc = useDuelStore((s) => s.setPointerNdc)

  const samplesRef = useRef<Sample[]>([])
  const activeRef = useRef(false)

  const reportNdc = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      setPointerNdc(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      )
    },
    [setPointerNdc]
  )

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    activeRef.current = true
    samplesRef.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }]
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeRef.current) {
        samplesRef.current.push({ x: e.clientX, y: e.clientY, t: performance.now() })
      } else {
        // Hovering: aim the reticle. (While snapping, the aim stays locked.)
        reportNdc(e)
      }
    },
    [reportNdc]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!activeRef.current) return
      activeRef.current = false
      const samples = samplesRef.current
      samples.push({ x: e.clientX, y: e.clientY, t: performance.now() })
      samplesRef.current = []

      const first = samples[0]
      const last = samples[samples.length - 1]
      const totalDx = last.x - first.x
      const totalDy = last.y - first.y
      const totalDist = Math.hypot(totalDx, totalDy)
      if (totalDist < DUEL.minFlickDistPx) {
        // A tap: lock the aim where the reticle currently sits. The locked
        // target survives moving the mouse into flick position.
        lockAim()
        return
      }

      // Release velocity over the trailing window (fallback: whole chord).
      const windowStart = last.t - DUEL.flickWindowMs
      let wi = samples.findIndex((s) => s.t >= windowStart)
      if (wi < 0 || wi >= samples.length - 1) wi = Math.max(0, samples.length - 2)
      const w0 = samples[wi]
      let dt = Math.max(1, last.t - w0.t)
      let wdx = last.x - w0.x
      let wdy = last.y - w0.y
      if (Math.hypot(wdx, wdy) < 8) {
        wdx = totalDx
        wdy = totalDy
        dt = Math.max(1, last.t - first.t)
      }
      const pxPerMs = Math.hypot(wdx, wdy) / dt

      // Straightness: worst deviation of the path from the chord.
      let maxDev = 0
      const nx = -totalDy / totalDist
      const ny = totalDx / totalDist
      for (const s of samples) {
        const dev = Math.abs((s.x - first.x) * nx + (s.y - first.y) * ny)
        if (dev > maxDev) maxDev = dev
      }
      const straightness = Math.max(0, Math.min(1, 1 - (maxDev / totalDist) * 2.5))

      // Require a mostly-forward (screen-up) snap — it's a slam, not a swipe.
      if (totalDy > -DUEL.minFlickDistPx * 0.5) return

      const speed = Math.max(
        DUEL.minSpeed,
        Math.min(DUEL.maxSpeed, pxPerMs * DUEL.pxPerMsToSpeed)
      )

      if (import.meta.env.DEV)
        console.debug('[flick] throw:', { pxPerMs, speed, straightness })
      throwChip({ speed, straightness })
    },
    [throwChip]
  )

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
