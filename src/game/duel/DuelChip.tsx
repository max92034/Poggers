import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { DUEL } from './duelConstants'
import { useDuelStore } from './duelStore'

interface DuelChipProps {
  role: 'attacker' | 'defender'
}

const UP = new THREE.Vector3(0, 1, 0)

/**
 * A duel chip. The defender lies flat inside the circle; the attacker hovers
 * "in hand" at the spawn point (kinematic) until a flick launches it (dynamic).
 * Both report their face-up/face-down state to the store every frame.
 */
export function DuelChip({ role }: DuelChipProps) {
  const bodyRef = useRef<RapierRigidBody>(null)

  const phase = useDuelStore((s) => s.phase)
  const throwId = useDuelStore((s) => s.throwId)
  const resetId = useDuelStore((s) => s.resetId)

  const isAttacker = role === 'attacker'

  // --- Reset: restore spawn pose, kill all motion ---
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const pos = isAttacker ? DUEL.spawnPos : DUEL.defenderPos
    body.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true)
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }, [resetId, isAttacker])

  // --- Launch (attacker only): runs after the flick sets phase='flight'.
  // The RigidBody's type prop has already switched to 'dynamic' by the time
  // this effect fires (child effects flush first), so velocities stick.
  useEffect(() => {
    if (!isAttacker || throwId === 0) return
    const body = bodyRef.current
    const params = useDuelStore.getState().lastThrow
    if (!body || !params) return

    const { dirX, dirZ, speed, straightness } = params

    // Start from the hand position, tilted by flick crookedness (a crooked
    // snap = a banked chip that won't land flat and leaks its gust later).
    body.setTranslation(
      { x: DUEL.spawnPos[0], y: DUEL.spawnPos[1], z: DUEL.spawnPos[2] },
      true
    )
    const tilt = (1 - straightness) * DUEL.maxLandingTiltRad
    const rollAxis = new THREE.Vector3(dirX, 0, dirZ).normalize()
    const q = new THREE.Quaternion().setFromAxisAngle(rollAxis, tilt)
    body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true)

    // Downward-pitched launch velocity along the flick direction.
    const cosP = Math.cos(DUEL.throwPitchRad)
    const sinP = Math.sin(DUEL.throwPitchRad)
    body.setLinvel(
      { x: dirX * speed * cosP, y: -speed * sinP, z: dirZ * speed * cosP },
      true
    )

    // Wrist-snap spin around the chip's up axis, plus a touch of wobble
    // proportional to how crooked the flick was.
    body.setAngvel(
      {
        x: rollAxis.x * tilt * 3,
        y: -DUEL.spinPerSpeed * speed,
        z: rollAxis.z * tilt * 3,
      },
      true
    )
  }, [throwId, isAttacker])

  // --- Per-frame: flip readout + settle detection ---
  const restTimeRef = useRef(0)
  const flightTimeRef = useRef(0)
  const quatRef = useRef(new THREE.Quaternion())
  const upRef = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const body = bodyRef.current
    if (!body) return

    // Face-down check via up-vector (same approach as PogDisc).
    const rot = body.rotation()
    quatRef.current.set(rot.x, rot.y, rot.z, rot.w)
    upRef.current.copy(UP).applyQuaternion(quatRef.current)
    const flipped = upRef.current.y < 0
    const store = useDuelStore.getState()
    if (isAttacker) store.setAttackerFlipped(flipped)
    else store.setDefenderFlipped(flipped)

    // Settle detection is driven by the attacker chip.
    if (!isAttacker) return
    if (phase !== 'flight') {
      restTimeRef.current = 0
      flightTimeRef.current = 0
      return
    }
    flightTimeRef.current += delta
    const v = body.linvel()
    const speed = Math.hypot(v.x, v.y, v.z)
    restTimeRef.current = speed < DUEL.restSpeed ? restTimeRef.current + delta : 0
    if (
      restTimeRef.current >= DUEL.restDuration ||
      flightTimeRef.current >= DUEL.flightTimeout
    ) {
      store.enterSettled()
    }
  })

  // Attacker is parked in the "hand" until thrown; defender is always dynamic.
  const bodyType = isAttacker && phase === 'ready' ? 'kinematicPosition' : 'dynamic'

  const topColor = isAttacker ? '#e8b23a' : '#4a90d9'
  const bottomColor = isAttacker ? '#8a5a10' : '#142a42'

  return (
    <RigidBody
      ref={bodyRef}
      type={bodyType}
      colliders={false}
      position={isAttacker ? [...DUEL.spawnPos] : [...DUEL.defenderPos]}
      mass={DUEL.chipMass}
      restitution={DUEL.chipRestitution}
      friction={DUEL.chipFriction}
      linearDamping={0.3}
      angularDamping={0.5}
      ccd
    >
      <CylinderCollider args={[DUEL.chipThickness / 2, DUEL.chipRadius]} />
      <mesh castShadow receiveShadow>
        <cylinderGeometry
          args={[DUEL.chipRadius, DUEL.chipRadius, DUEL.chipThickness, DUEL.chipSegments]}
        />
        {/* [side, top, bottom] — top and bottom contrast hard so a flip reads instantly */}
        <meshStandardMaterial attach="material-0" color={isAttacker ? '#c98f1f' : '#2f6cab'} flatShading roughness={0.7} />
        <meshStandardMaterial attach="material-1" color={topColor} flatShading roughness={0.6} />
        <meshStandardMaterial attach="material-2" color={bottomColor} flatShading roughness={0.6} />
      </mesh>
    </RigidBody>
  )
}
