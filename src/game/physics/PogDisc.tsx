import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { ARENA, STAT_PHYSICS } from './constants'
import { useGameStore } from '../store/gameStore'
import { pogTextureUrl } from '../../art/assets'

interface PogDiscProps {
  id: string
  position: [number, number, number]
  rotation?: [number, number, number]
  charId: string // for texture
  palette: { primary: string; secondary: string; accent: string }
  isMain?: boolean
  mainSide?: 'player' | 'ai'
  shotId: number
  slippery?: boolean
}

/**
 * A single pog disc. Tracks its own orientation each frame and fires onFlip
 * exactly once per shot when it transitions to face-down.
 */
export function PogDisc({ position, rotation, charId, palette, isMain = false, mainSide, shotId, slippery = false }: PogDiscProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  const phase = useGameStore((s) => s.phase)
  const recordFlip = useGameStore((s) => s.recordFlip)

  // Track per-shot flip state
  const lastShotIdRef = useRef(shotId)
  const flippedRef = useRef(false)
  const reportedRef = useRef(false)

  // Load pog texture (falls back to null on missing file → solid color material)
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const url = pogTextureUrl(charId)
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace
      setTexture(t)
    }, undefined, () => setTexture(null))
  }, [charId])

  // Reset flip tracking when a new shot starts
  if (lastShotIdRef.current !== shotId) {
    lastShotIdRef.current = shotId
    reportedRef.current = false
    // Don't pre-set flippedRef here; we'll recompute on next frame
  }

  useFrame(() => {
    const body = bodyRef.current
    if (!body) return

    // Detect flip via up-vector. Pog's local up is (0,1,0); after rotation, if its world-y is negative, it's flipped.
    const rot = body.rotation()
    const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    const nowFlipped = up.y < 0

    // Reset snapshot at start of each shot
    if (lastShotIdRef.current !== shotId) {
      lastShotIdRef.current = shotId
      reportedRef.current = false
      flippedRef.current = nowFlipped
      return
    }

    // Only count flips during active simulation phases
    if (phase !== 'launching' && phase !== 'resolving') {
      flippedRef.current = nowFlipped
      return
    }

    if (nowFlipped && !flippedRef.current && !reportedRef.current) {
      reportedRef.current = true
      recordFlip(!!isMain, mainSide ?? null)
    }
    flippedRef.current = nowFlipped
  })

  const radius = isMain ? ARENA.stackRadius * 1.15 : ARENA.stackRadius
  const height = isMain ? ARENA.stackHeight * 1.4 : ARENA.stackHeight
  const mass = isMain ? STAT_PHYSICS.pogMass * 2.5 : STAT_PHYSICS.pogMass

  // Slippery (Baby Oil) reduces friction and increases restitution
  const pogRestitution = slippery
    ? Math.min(0.95, STAT_PHYSICS.pogRestitution + 0.25)
    : STAT_PHYSICS.pogRestitution
  const pogFriction = slippery
    ? Math.max(0.05, STAT_PHYSICS.pogFriction * 0.3)
    : STAT_PHYSICS.pogFriction

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      position={position}
      rotation={rotation}
      mass={mass}
      restitution={pogRestitution}
      friction={pogFriction}
      linearDamping={slippery ? 0.15 : 0.4}
      angularDamping={slippery ? 0.3 : 0.6}
      ccd
    >
      <CylinderCollider args={[height / 2, radius]} />
      {/* Side band: thin rim color = secondary palette color */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 32]} />
        {/* Material array: [side, top, bottom] */}
        <meshStandardMaterial attach="material-0" color={palette.secondary} roughness={0.6} />
        <meshStandardMaterial attach="material-1" map={texture ?? undefined} color={texture ? '#ffffff' : palette.primary} roughness={0.5} />
        <meshStandardMaterial attach="material-2" color={palette.accent} roughness={0.6} />
      </mesh>
    </RigidBody>
  )
}
