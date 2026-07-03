import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { ARENA, STAT_PHYSICS, RESOLUTION } from './constants'
import { useGameStore } from '../store/gameStore'
import type { Character } from '../characters/types'
import type { SlammerItem } from '../items/types'
import {
  computeSlammerMass,
  computeSlammerSpin,
  computeSlammerRestitution,
  computeSlammerFriction,
} from '../items/itemPhysics'

interface SlammerProps {
  attackerChar: Character
  attackerSide: 'player' | 'ai'
  aimAngle: number
  lockedPower: number
  shotId: number
  items: SlammerItem[]
  bodyRef?: React.MutableRefObject<RapierRigidBody | null>
}

const PARK_POS = { x: 0, y: 50, z: 0 }
const ZERO_VEL = { x: 0, y: 0, z: 0 }

/**
 * The slammer disc. Always mounted (avoids Rapier removeRigidBody crashes that
 * occur on unmount/remount between rounds). Switches its body `type` between
 * 'dynamic' (active) and 'fixed' (parked). Launch velocity is applied inside
 * useFrame on the first frame of each new shot, after the body type has fully
 * transitioned to dynamic.
 *
 * Item effects:
 * - Pocket Lighter: U-shape visual, lighter mass, more spin, extra bounce.
 * - Chewing Gum: pink blob visual, heavier mass, more spin, higher friction.
 * - Magnets: glow ring visual, dramatically increased spin.
 *   TODO: Implement metallic pog attraction in the elemental patch.
 */
export function Slammer({ attackerChar, attackerSide, aimAngle, lockedPower, shotId, items, bodyRef: externalBodyRef }: SlammerProps) {
  const internalBodyRef = useRef<RapierRigidBody>(null)
  const bodyRef = externalBodyRef ?? internalBodyRef
  const settledTimerRef = useRef(0)
  const elapsedRef = useRef(0)
  const reportedRef = useRef(false)
  const firedShotIdRef = useRef<number>(-1)

  const phase = useGameStore((s) => s.phase)
  const enterResolving = useGameStore((s) => s.enterResolving)

  const zSign = attackerSide === 'player' ? 1 : -1
  const spawn: [number, number, number] = [
    0,
    ARENA.slammerSpawnHeight,
    zSign * 0.1,
  ]

  const isActive = phase === 'launching' || phase === 'resolving'

  // Item-based physics values
  const baseMass = STAT_PHYSICS.slammerMass(attackerChar.stats.weight)
  const mass = computeSlammerMass(baseMass, items)
  const baseRest = STAT_PHYSICS.slammerRestitution(attackerChar.stats.bounce)
  const restitution = computeSlammerRestitution(baseRest, items)
  const friction = computeSlammerFriction(0.4, items)

  const radius = ARENA.slammerRadius
  const height = ARENA.slammerHeight

  // Visual flags
  const hasUShape = items.some((i) => i.visualType === 'u-shape')
  const hasGumBlob = items.some((i) => i.visualType === 'gum-blob')
  const hasMagnetGlow = items.some((i) => i.visualType === 'magnetic-glow')

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return

    if (phase === 'launching') {
      if (firedShotIdRef.current !== shotId) {
        reportedRef.current = false
        settledTimerRef.current = 0
        elapsedRef.current = 0
        body.setTranslation({ x: spawn[0], y: spawn[1], z: spawn[2] }, true)
        body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        body.setLinvel(ZERO_VEL, true)
        body.setAngvel(ZERO_VEL, true)
      }
    } else if (phase !== 'resolving') {
      body.setTranslation(PARK_POS, true)
      body.setLinvel(ZERO_VEL, true)
      body.setAngvel(ZERO_VEL, true)
    }
  }, [phase, shotId]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (phase !== 'launching') return
    const body = bodyRef.current
    if (!body || reportedRef.current) return

    if (firedShotIdRef.current !== shotId) {
      firedShotIdRef.current = shotId

      const spawnVec = new THREE.Vector3(...spawn)
      const aimOffsetX = Math.sin(aimAngle) * ARENA.slammerAimRadius
      const aimOffsetZ = Math.cos(aimAngle) * ARENA.slammerAimRadius * zSign
      const aimTarget = new THREE.Vector3(
        aimOffsetX,
        ARENA.slammerTargetHeight,
        aimOffsetZ,
      )
      const dir = aimTarget.clone().sub(spawnVec).normalize()

      const speed = STAT_PHYSICS.launchSpeed(attackerChar.stats.power, lockedPower)

      // Modified mass and spin from items
      const impulse = { x: dir.x * speed * mass, y: dir.y * speed * mass, z: dir.z * speed * mass }
      body.applyImpulse(impulse, true)

      const baseSpinMag = STAT_PHYSICS.spinImpulse(attackerChar.stats.spin, lockedPower)
      const spinMag = computeSlammerSpin(baseSpinMag, items)
      const horizDir = new THREE.Vector3(dir.x, 0, dir.z).normalize()
      const spinAxis = new THREE.Vector3(-horizDir.z, 0, horizDir.x)
      body.applyTorqueImpulse({ x: spinAxis.x * spinMag, y: spinAxis.y * spinMag, z: spinAxis.z * spinMag }, true)
    }

    const vel = body.linvel()
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)

    const t = body.translation()
    ;(window as any).__slammer = {
      t: [t.x.toFixed(2), t.y.toFixed(2), t.z.toFixed(2)],
      speed: speed.toFixed(2),
      shotId,
      elapsed: elapsedRef.current.toFixed(2),
      bodyType: body.bodyType(),
    }

    elapsedRef.current += delta

    if (speed < RESOLUTION.slammerRestThreshold) {
      settledTimerRef.current += delta
      if (settledTimerRef.current >= RESOLUTION.slammerRestDuration) {
        reportedRef.current = true
        enterResolving()
      }
    } else {
      settledTimerRef.current = 0
    }

    if (elapsedRef.current >= RESOLUTION.shotTimeout) {
      reportedRef.current = true
      enterResolving()
    }
  })

  return (
    <RigidBody
      ref={bodyRef}
      type={isActive ? 'dynamic' : 'fixed'}
      colliders={false}
      position={spawn}
      mass={mass}
      restitution={restitution}
      friction={friction}
      linearDamping={0.15}
      angularDamping={0.2}
      ccd
    >
      {/* Main collider — always present */}
      <CylinderCollider args={[height / 2, radius]} density={mass / (Math.PI * radius * radius * height)} />

      {/* U-shape: extra side colliders for the two arms */}
      {hasUShape && (
        <>
          <CylinderCollider
            args={[height / 2, radius * 0.4]}
            position={[-radius * 0.65, 0, 0]}
            density={mass / (Math.PI * radius * radius * height)}
          />
          <CylinderCollider
            args={[height / 2, radius * 0.4]}
            position={[radius * 0.65, 0, 0]}
            density={mass / (Math.PI * radius * radius * height)}
          />
        </>
      )}

      {/* Base mesh (default cylinder) */}
      <mesh castShadow visible={isActive}>
        <cylinderGeometry args={[radius, radius, height, 32]} />
        <meshStandardMaterial
          color={attackerChar.palette.accent}
          metalness={0.6}
          roughness={0.25}
          emissive={attackerChar.palette.primary}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* U-shape visual: two side cylinders + bottom connector */}
      {hasUShape && isActive && (
        <>
          <mesh position={[-radius * 0.65, 0, 0]} castShadow>
            <cylinderGeometry args={[radius * 0.4, radius * 0.4, height, 16]} />
            <meshStandardMaterial
              color={attackerChar.palette.accent}
              metalness={0.5}
              roughness={0.3}
              emissive={attackerChar.palette.primary}
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh position={[radius * 0.65, 0, 0]} castShadow>
            <cylinderGeometry args={[radius * 0.4, radius * 0.4, height, 16]} />
            <meshStandardMaterial
              color={attackerChar.palette.accent}
              metalness={0.5}
              roughness={0.3}
              emissive={attackerChar.palette.primary}
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh position={[0, -height / 2 - radius * 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[radius * 0.25, radius * 0.25, radius * 1.4, 12]} />
            <meshStandardMaterial
              color={attackerChar.palette.accent}
              metalness={0.5}
              roughness={0.3}
            />
          </mesh>
        </>
      )}

      {/* Gum blob visual: pink sphere on the bottom face */}
      {hasGumBlob && isActive && (
        <mesh position={[0, -height / 2 - radius * 0.25, 0]} castShadow>
          <sphereGeometry args={[radius * 0.55, 16, 16]} />
          <meshStandardMaterial
            color="#ff6b9d"
            roughness={0.2}
            metalness={0.1}
            emissive="#ff4d8a"
            emissiveIntensity={0.15}
          />
        </mesh>
      )}

      {/* Magnetic glow: faint rotating ring */}
      {hasMagnetGlow && isActive && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.4, radius * 0.08, 8, 32]} />
          <meshStandardMaterial
            color="#4ecdc4"
            emissive="#4ecdc4"
            emissiveIntensity={0.6}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </RigidBody>
  )
}
