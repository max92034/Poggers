import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { DUEL } from './duelConstants'
import { useDuelStore } from './duelStore'
import { registerChip, unregisterChip, otherChips } from './chipRegistry'

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

  // --- Registry: make this body reachable by the gust system ---
  useEffect(() => {
    const body = bodyRef.current
    if (body) registerChip(role, body)
    return () => unregisterChip(role)
  }, [role])

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

  // --- The gust: fires once per throw, on the attacker's first ground hit.
  // A flat fast slam shoves a ring of air outward at ground level; every
  // other chip in range gets an upward impulse at its NEAR edge, tipping it
  // away from the impact — exactly how the real air-pressure flip works.
  const gustFiredRef = useRef(false)
  const prevVelRef = useRef(new THREE.Vector3())
  useEffect(() => {
    gustFiredRef.current = false
  }, [throwId, resetId])

  const fireGust = () => {
    const body = bodyRef.current
    if (!body || gustFiredRef.current) return
    gustFiredRef.current = true

    // Slam kinematics from the frame BEFORE the contact solver ate them.
    const impactSpeed = prevVelRef.current.length()
    const rot = body.rotation()
    const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    const flatness = Math.abs(up.y) // 1 = landed perfectly flat

    const pos = body.translation()
    const strength =
      flatness < DUEL.gustMinFlatness ? 0 : impactSpeed * flatness * flatness

    if (import.meta.env.DEV)
      console.debug('[gust] fired:', { impactSpeed, flatness, strength, x: pos.x, z: pos.z })
    useDuelStore
      .getState()
      .recordSlam(pos.x, pos.z, Math.min(1, strength / DUEL.maxSpeed))
    if (strength <= 0) return

    for (const [, other] of otherChips(role)) {
      const opos = other.translation()
      const dx = opos.x - pos.x
      const dz = opos.z - pos.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.01 || dist > DUEL.gustRadius) continue
      // Only ground-level chips catch the gust
      if (opos.y > DUEL.chipRadius) continue

      const falloff = 1 - dist / DUEL.gustRadius
      // Normalized gust power at this target, 0..1
      // Linear falloff: chips landing "beside" the target (0.5–0.9m apart,
      // i.e. edge to edge) still catch a flipping-strength gust.
      const p = Math.min(1, (strength / DUEL.gustRefSpeed) * falloff)
      if (p < 0.03) continue
      const rx = dx / dist
      const rz = dz / dist

      if (import.meta.env.DEV) console.debug('[gust] target:', { dist, falloff, p })

      // Unstick from the ground so the tip rotation isn't ground away.
      other.setTranslation(
        { x: opos.x, y: opos.y + DUEL.gustPreLift, z: opos.z },
        true
      )
      // Hop up + slide outward (velocity change via CoM impulse)...
      const mass = other.mass()
      other.applyImpulse(
        {
          x: rx * DUEL.gustSlide * p * mass,
          y: DUEL.gustLift * p * mass,
          z: rz * DUEL.gustSlide * p * mass,
        },
        true
      )
      // ...plus a tipping rotation about the horizontal axis perpendicular
      // to the blast direction, lifting the near edge (axis = ŷ × r̂).
      const w = DUEL.gustTipOmega * p
      other.setAngvel({ x: rz * w, y: 0, z: -rx * w }, true)
    }
  }

  // --- Per-frame: flip readout + settle detection ---
  const restTimeRef = useRef(0)
  const flightTimeRef = useRef(0)
  const slowmoTimeRef = useRef(0)
  const quatRef = useRef(new THREE.Quaternion())
  const upRef = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const body = bodyRef.current
    if (!body) return

    // Face-down check via up-vector (same approach as PogDisc).
    const rot = body.rotation()
    quatRef.current.set(rot.x, rot.y, rot.z, rot.w)
    upRef.current.copy(UP).applyQuaternion(quatRef.current)
    const upY = upRef.current.y
    const flipped = upY < 0
    const store = useDuelStore.getState()
    if (isAttacker) store.setAttackerFlipped(flipped)
    else store.setDefenderFlipped(flipped)

    if (isAttacker) {
      // Slam detection: the frame the chip abruptly stops falling — works
      // whether it hits the ground or lands on another chip. prevVelRef is
      // one frame old, i.e. pre-impact, which is what the gust reads.
      if (phase === 'flight' && !gustFiredRef.current) {
        const v = body.linvel()
        const pos = body.translation()
        const wasFalling = prevVelRef.current.y < -1.0
        const stoppedFalling = v.y > -0.3
        if ((wasFalling && stoppedFalling) || pos.y <= DUEL.chipThickness / 2 + 0.01) {
          fireGust()
        } else {
          prevVelRef.current.set(v.x, v.y, v.z)
        }
      }

      // Settle detection is driven by the attacker chip.
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
        store.setTimeScale(1)
        store.enterSettled()
      }
      return
    }

    // Defender: wobble slow-mo. When the chip teeters near its tipping
    // point mid-throw, dilate time — this is THE clip moment.
    if (phase !== 'flight') {
      slowmoTimeRef.current = 0
      return
    }
    const tilted = upY > 0 && upY < DUEL.wobbleEnter
    const budgetLeft = slowmoTimeRef.current < DUEL.slowmoMaxSec
    if (tilted && budgetLeft && store.slam !== null) {
      store.setTimeScale(DUEL.slowmoScale)
      slowmoTimeRef.current += delta / DUEL.slowmoScale // count real time
    } else if (store.timeScale !== 1 && (upY >= DUEL.wobbleExit || flipped || !budgetLeft)) {
      store.setTimeScale(1)
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
      angularDamping={0.2}
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
