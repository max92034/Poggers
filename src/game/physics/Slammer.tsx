import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  RigidBody,
  CylinderCollider,
  BallCollider,
  type RapierRigidBody,
  type CollisionEnterPayload,
} from '@react-three/rapier'
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
 * - Pocket Lighter: U/banana shape (partial torus), lighter mass, more spin, extra bounce.
 * - Chewing Gum: pink blob visual, heavier mass, more spin, higher friction.
 *   Sticky: pogs that collide with the slammer get spring-attached, moving with it.
 * - Magnets: glow ring visual, dramatically increased spin.
 *   TODO: Implement metallic pog attraction in the elemental patch.
 */
export function Slammer({
  attackerChar,
  attackerSide,
  aimAngle,
  lockedPower,
  shotId,
  items,
  bodyRef: externalBodyRef,
}: SlammerProps) {
  const internalBodyRef = useRef<RapierRigidBody>(null)
  const bodyRef = externalBodyRef ?? internalBodyRef
  const settledTimerRef = useRef(0)
  const elapsedRef = useRef(0)
  const reportedRef = useRef(false)
  const firedShotIdRef = useRef<number>(-1)

  // Sticky gum: track which pog bodies are stuck to this slammer
  const stuckBodiesRef = useRef<RapierRigidBody[]>([])
  // Flag: has the slammer hit any pog yet? Triggers rotation air resistance.
  const hasHitPogRef = useRef(false)

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

  // Clear stuck bodies when a new shot starts
  useEffect(() => {
    if (phase === 'launching' && firedShotIdRef.current !== shotId) {
      stuckBodiesRef.current = []
      hasHitPogRef.current = false
    }
  }, [phase, shotId])

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
      stuckBodiesRef.current = []
    }
  }, [phase, shotId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Collision handler for gum stickiness and rotation air resistance trigger
  const handleCollisionEnter = (payload: CollisionEnterPayload) => {
    hasHitPogRef.current = true
    if (!hasGumBlob) return
    const otherBody = payload.other.rigidBody
    if (!otherBody) return
    // Only stick to dynamic bodies (pogs)
    const currentStuck = stuckBodiesRef.current
    if (currentStuck.includes(otherBody)) return
    if (otherBody.bodyType() !== 1) return // 1 = dynamic
    stuckBodiesRef.current = [...currentStuck, otherBody]
  }

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

      // Impulse = mass * velocity_change. To achieve velocity = speed in the
      // launch direction, impulse = dir * speed * mass.
      const impulse = {
        x: dir.x * speed * mass,
        y: dir.y * speed * mass,
        z: dir.z * speed * mass,
      }
      body.applyImpulse(impulse, true)

      const baseSpinMag = STAT_PHYSICS.spinImpulse(attackerChar.stats.spin, lockedPower)
      const spinMag = computeSlammerSpin(baseSpinMag, items)
      const horizDir = new THREE.Vector3(dir.x, 0, dir.z).normalize()
      const spinAxis = new THREE.Vector3(-horizDir.z, 0, horizDir.x)
      body.applyTorqueImpulse(
        {
          x: spinAxis.x * spinMag,
          y: spinAxis.y * spinMag,
          z: spinAxis.z * spinMag,
        },
        true,
      )
    }

    // Gum stickiness: pull stuck pogs toward the slammer using velocity blending
    if (hasGumBlob && stuckBodiesRef.current.length > 0) {
      const slammerPos = body.translation()
      const slammerVel = body.linvel()
      const sPos = new THREE.Vector3(slammerPos.x, slammerPos.y, slammerPos.z)
      const sVel = new THREE.Vector3(slammerVel.x, slammerVel.y, slammerVel.z)

      for (const pogBody of stuckBodiesRef.current) {
        // Skip if the body was removed or is no longer dynamic
        if (!pogBody || pogBody.bodyType() !== 1) continue

        const pogPos = pogBody.translation()
        const pogVel = pogBody.linvel()
        const pPos = new THREE.Vector3(pogPos.x, pogPos.y, pogPos.z)

        // Target: slammer bottom (where the gum blob is)
        const gumOffset = new THREE.Vector3(0, -height / 2 - radius * 0.25, 0)
        const target = sPos.clone().add(gumOffset)
        const diff = target.clone().sub(pPos)

        // Spring: blend pog velocity toward slammer velocity + pull toward gum
        const pullStrength = 8.0
        const velBlend = 6.0
        const newVel = {
          x: pogVel.x + (sVel.x - pogVel.x) * velBlend * delta + diff.x * pullStrength * delta,
          y: pogVel.y + (sVel.y - pogVel.y) * velBlend * delta + diff.y * pullStrength * delta,
          z: pogVel.z + (sVel.z - pogVel.z) * velBlend * delta + diff.z * pullStrength * delta,
        }
        pogBody.setLinvel(newVel, true)
      }
    }

    // Rotation air resistance: after impact with pogs, slow down spin dramatically.
    // This prevents the slammer from spinning indefinitely after hitting the stack.
    if (hasHitPogRef.current) {
      const angVel = body.angvel()
      const angSpeed = Math.sqrt(angVel.x * angVel.x + angVel.y * angVel.y + angVel.z * angVel.z)
      if (angSpeed > 0.1) {
        const airResistance = 0.12 // Strong damping coefficient
        const newAngVel = {
          x: angVel.x * (1 - airResistance),
          y: angVel.y * (1 - airResistance),
          z: angVel.z * (1 - airResistance),
        }
        body.setAngvel(newAngVel, true)
      }
    }

    const vel = body.linvel()
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)

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

  // --- U/banana shape: a cylinder bent into a banana arc ---
  // Build the bent cylinder geometry by curving a standard cylinder along X.
  const uBendRadius = 0.7 // how tight the bend is
  const uBendAngle = Math.PI * 0.18 // ~32° of arc — subtle banana curve
  const uTubeRadius = radius * 0.85 // collider radius for U-shape

  const uBentGeom = useMemo(() => {
    const cyl = new THREE.CylinderGeometry(radius, radius, height, 24, 16, false)
    const pos = cyl.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3
      const x = arr[ix]
      const y = arr[ix + 1]
      const z = arr[ix + 2]
      // Map x in [-h/2, h/2] to an angle in [-uBendAngle/2, uBendAngle/2]
      const t = (x + height / 2) / height // 0..1 along length
      const angle = (t - 0.5) * uBendAngle
      // New position: bent around Z axis
      const rx = Math.sin(angle) * uBendRadius
      const rz = (Math.cos(angle) - 1) * uBendRadius
      arr[ix] = rx
      arr[ix + 1] = y
      arr[ix + 2] = z + rz
    }
    cyl.computeVertexNormals()
    return cyl
  }, [radius, height])

  // Ball colliders along the curved centerline.
  // IMPORTANT: density must yield the SAME total mass as the default cylinder,
  // otherwise applyImpulse(impulse = mass * speed) will be applied against a
  // body whose actual mass is very different, causing runaway velocity.
  const uColliderPts = useMemo(() => {
    const pts: Array<[number, number, number]> = []
    const n = 6
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const angle = (t - 0.5) * uBendAngle
      const rx = Math.sin(angle) * uBendRadius
      const rz = (Math.cos(angle) - 1) * uBendRadius
      pts.push([rx, 0, rz])
    }
    return pts
  }, [])

  // Default cylinder collider mass (matches the non-U-shape mass)
  const defaultCylinderVolume = Math.PI * radius * radius * height
  // 7 ball colliders for U-shape: total volume = 7 * (4/3)π r³
  const uBallTotalVolume = 7 * (4 / 3) * Math.PI * Math.pow(uTubeRadius, 3)
  // density = mass / volume, so total collider mass = density * totalVolume = mass
  const uColliderDensity = mass / uBallTotalVolume
  const defaultCylinderDensity = mass / defaultCylinderVolume

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
      onCollisionEnter={handleCollisionEnter}
    >
      {hasUShape ? (
        <>
          {/* U-shape colliders: spheres along the bent centerline */}
          {uColliderPts.map((pt, i) => (
            <BallCollider
              key={i}
              args={[uTubeRadius]}
              position={[pt[0], pt[1], pt[2]]}
              density={uColliderDensity}
            />
          ))}
        </>
      ) : (
        /* Default: single cylinder collider */
        <CylinderCollider
          args={[height / 2, radius]}
          density={defaultCylinderDensity}
        />
      )}

      {/* --- Visual meshes --- */}

      {hasUShape ? (
        /* U/banana shape: bent cylinder (concave-up banana) */
        <mesh castShadow visible={isActive} geometry={uBentGeom}>
          <meshStandardMaterial
            color={attackerChar.palette.accent}
            metalness={0.6}
            roughness={0.25}
            emissive={attackerChar.palette.primary}
            emissiveIntensity={0.25}
          />
        </mesh>
      ) : (
        /* Default cylinder */
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
