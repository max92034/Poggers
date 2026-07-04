import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DUEL } from './duelConstants'
import { useDuelStore } from './duelStore'

const RING_DURATION = 0.45 // s

/**
 * Expanding ground-level ring on each slam — makes the invisible air blast
 * readable. Ring size/opacity scale with gust strength, so a TILTED landing
 * visibly fizzles while a CLEAN one blasts the full radius.
 */
export function GustRing() {
  const slam = useDuelStore((s) => s.slam)
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const clockRef = useRef(-1) // -1 = idle

  useEffect(() => {
    if (slam) clockRef.current = 0
  }, [slam?.id])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    const mat = matRef.current
    if (!mesh || !mat || clockRef.current < 0 || !slam) return
    clockRef.current += delta
    const t = Math.min(1, clockRef.current / RING_DURATION)
    const eased = 1 - (1 - t) * (1 - t) // ease-out
    const maxR = 0.3 + DUEL.gustRadius * (0.35 + 0.65 * slam.strength)
    const r = 0.2 + eased * maxR
    mesh.position.set(slam.x, 0.015, slam.z)
    mesh.scale.set(r, r, 1)
    mat.opacity = (1 - t) * (0.25 + 0.55 * slam.strength)
    if (t >= 1) {
      clockRef.current = -1
      mat.opacity = 0
    }
  })

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} visible={!!slam}>
      <ringGeometry args={[0.82, 1, 48]} />
      <meshBasicMaterial
        ref={matRef}
        color="#ffffff"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}
