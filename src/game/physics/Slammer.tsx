import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { ARENA, STAT_PHYSICS, RESOLUTION } from './constants'
import { useGameStore } from '../store/gameStore'
import type { Character } from '../characters/types'

interface SlammerProps {
  attackerChar: Character
  attackerSide: 'player' | 'ai'
  aimAngle: number
  lockedPower: number
  shotId: number
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
 */
export function Slammer({ attackerChar, attackerSide, aimAngle, lockedPower, shotId, bodyRef: externalBodyRef }: SlammerProps) {
  const internalBodyRef = useRef<RapierRigidBody>(null)
  const bodyRef = externalBodyRef ?? internalBodyRef
  const settledTimerRef = useRef(0)
  const elapsedRef = useRef(0)
  const reportedRef = useRef(false)
  // ShotId for which launch velocity has been applied
  const firedShotIdRef = useRef<number>(-1)

  const phase = useGameStore((s) => s.phase)
  const enterResolving = useGameStore((s) => s.enterResolving)

  const zSign = attackerSide === 'player' ? 1 : -1
  // Slammer spawns directly above the stack. Aim angle shifts the spawn
  // horizontally left/right so it crashes down onto a specific spot on the stack.
  const spawn: [number, number, number] = [
    0,
    ARENA.slammerSpawnHeight,
    zSign * 0.1, // tiny offset so it doesn't spawn exactly above center
  ]

  const isActive = phase === 'launching' || phase === 'resolving'

  // Reset position + tracking refs when a new shot starts (position only,
  // velocity is set in useFrame after the body type transitions to dynamic).
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

  // Apply launch velocity in the first useFrame of a new shot.
  // This guarantees the body type is already 'dynamic'.
  useFrame((_, delta) => {
    if (phase !== 'launching') return
    const body = bodyRef.current
    if (!body || reportedRef.current) return

    // Apply launch impulse on the first frame of this shot.
    // Done in useFrame (not useEffect) to guarantee the body is already 'dynamic'
    // — avoids a timing issue with useEffect firing before the type prop change
    // has been fully applied by @react-three/rapier.
    if (firedShotIdRef.current !== shotId) {
      firedShotIdRef.current = shotId

      const spawnVec = new THREE.Vector3(...spawn)
      // Slammer crashes nearly straight down. Aim angle shifts the impact point
      // horizontally on the stack top so you can target different areas.
      const aimOffsetX = Math.sin(aimAngle) * ARENA.slammerAimRadius
      const aimOffsetZ = Math.cos(aimAngle) * ARENA.slammerAimRadius * zSign
      const aimTarget = new THREE.Vector3(
        aimOffsetX,
        ARENA.slammerTargetHeight,
        aimOffsetZ,
      )
      const dir = aimTarget.clone().sub(spawnVec).normalize()

      const speed = STAT_PHYSICS.launchSpeed(attackerChar.stats.power, lockedPower)
      const mass = STAT_PHYSICS.slammerMass(attackerChar.stats.weight)

      // Impulse = mass * velocity_delta
      const impulse = { x: dir.x * speed * mass, y: dir.y * speed * mass, z: dir.z * speed * mass }
      body.applyImpulse(impulse, true)

      // Torque impulse for spin
      const spinMag = STAT_PHYSICS.spinImpulse(attackerChar.stats.spin, lockedPower)
      const horizDir = new THREE.Vector3(dir.x, 0, dir.z).normalize()
      const spinAxis = new THREE.Vector3(-horizDir.z, 0, horizDir.x)
      body.applyTorqueImpulse({ x: spinAxis.x * spinMag, y: spinAxis.y * spinMag, z: spinAxis.z * spinMag }, true)
    }

    const vel = body.linvel()
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)

    // TEMP diagnostic
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

  const mass = STAT_PHYSICS.slammerMass(attackerChar.stats.weight)
  const restitution = STAT_PHYSICS.slammerRestitution(attackerChar.stats.bounce)
  const radius = ARENA.slammerRadius
  const height = ARENA.slammerHeight

  return (
    <RigidBody
      ref={bodyRef}
      type={isActive ? 'dynamic' : 'fixed'}
      colliders={false}
      position={spawn}
      mass={mass}
      restitution={restitution}
      friction={0.4}
      linearDamping={0.15}
      angularDamping={0.2}
      ccd
    >
      <CylinderCollider args={[height / 2, radius]} density={mass / (Math.PI * radius * radius * height)} />
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
    </RigidBody>
  )
}
