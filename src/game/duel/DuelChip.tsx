import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { DUEL } from './duelConstants'
import { useDuelStore, type DuelSide } from './duelStore'
import { registerChip, unregisterChip, otherChips } from './chipRegistry'

interface DuelChipProps {
  role: DuelSide
}

const UP = new THREE.Vector3(0, 1, 0)

/**
 * One side's chip. On your turn your chip is "in hand" (kinematic, hovering
 * at your edge of the circle); the opponent's chip lies where it last
 * settled. A flick/AI throw launches the hand chip; the gust fires on its
 * slam; the settled outcome is refereed by duelStore.resolveOutcome().
 */
export function DuelChip({ role }: DuelChipProps) {
  const bodyRef = useRef<RapierRigidBody>(null)

  const phase = useDuelStore((s) => s.phase)
  const currentTurn = useDuelStore((s) => s.currentTurn)
  const throwId = useDuelStore((s) => s.throwId)
  const resetId = useDuelStore((s) => s.resetId)

  const sign = role === 'player' ? 1 : -1
  const handPos: [number, number, number] = [
    DUEL.spawnPos[0],
    DUEL.spawnPos[1],
    DUEL.spawnPos[2] * sign,
  ]
  // AI's chip starts as the lying defender; player starts in hand.
  const groundStart: [number, number, number] = [
    DUEL.defenderPos[0],
    DUEL.defenderPos[1],
    DUEL.defenderPos[2],
  ]

  const isMyTurn = currentTurn === role
  const inHand = isMyTurn && (phase === 'ready' || phase === 'ai_think')

  // --- Registry: make this body reachable by gust/AI/referee ---
  useEffect(() => {
    const body = bodyRef.current
    if (body) registerChip(role, body)
    return () => unregisterChip(role)
  }, [role])

  // --- New duel: restore start pose ---
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const pos = role === 'player' ? handPos : groundStart
    body.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true)
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetId, role])

  // --- Pick up: teleport to hand at the start of my turn ---
  useEffect(() => {
    if (!inHand) return
    const body = bodyRef.current
    if (!body) return
    body.setTranslation({ x: handPos[0], y: handPos[1], z: handPos[2] }, true)
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inHand])

  // --- Launch: my throw just started ---
  useEffect(() => {
    if (throwId === 0) return
    const body = bodyRef.current
    const params = useDuelStore.getState().lastThrow
    if (!body || !params || params.attacker !== role) return

    const { dirX, dirZ, speed, straightness } = params

    body.setTranslation({ x: handPos[0], y: handPos[1], z: handPos[2] }, true)
    const tilt = (1 - straightness) * DUEL.maxLandingTiltRad
    const rollAxis = new THREE.Vector3(dirX, 0, dirZ).normalize()
    const q = new THREE.Quaternion().setFromAxisAngle(rollAxis, tilt)
    body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true)

    const cosP = Math.cos(DUEL.throwPitchRad)
    const sinP = Math.sin(DUEL.throwPitchRad)
    body.setLinvel(
      { x: dirX * speed * cosP, y: -speed * sinP, z: dirZ * speed * cosP },
      true
    )
    body.setAngvel(
      {
        x: rollAxis.x * tilt * 3,
        y: -DUEL.spinPerSpeed * speed,
        z: rollAxis.z * tilt * 3,
      },
      true
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [throwId, role])

  // --- The gust (see duelConstants for the model) ---
  const gustFiredRef = useRef(false)
  const prevVelRef = useRef(new THREE.Vector3())
  useEffect(() => {
    gustFiredRef.current = false
  }, [throwId, resetId])

  const fireGust = () => {
    const body = bodyRef.current
    if (!body || gustFiredRef.current) return
    gustFiredRef.current = true

    const impactSpeed = prevVelRef.current.length()
    const rot = body.rotation()
    const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    const flatness = Math.abs(up.y)

    const pos = body.translation()
    const strength =
      flatness < DUEL.gustMinFlatness ? 0 : impactSpeed * flatness * flatness

    if (import.meta.env.DEV)
      console.debug('[gust] fired:', { impactSpeed, flatness, strength })
    useDuelStore
      .getState()
      .recordSlam(pos.x, pos.z, Math.min(1, strength / DUEL.gustRefSpeed))

    // The slap eats the thrower's momentum: a flat slam stops nearly dead
    // where it lands (aim = destination), a tilted one skids onward.
    const keep = DUEL.slamVelocityKeep + (1 - flatness) * 0.4
    const v = body.linvel()
    body.setLinvel({ x: v.x * keep, y: 0, z: v.z * keep }, true)
    if (strength <= 0) return

    for (const [, other] of otherChips(role)) {
      const opos = other.translation()
      const dx = opos.x - pos.x
      const dz = opos.z - pos.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.01 || dist > DUEL.gustRadius) continue
      if (opos.y > DUEL.chipRadius) continue // only grounded chips catch it

      const falloff = 1 - dist / DUEL.gustRadius
      const p = Math.min(1, (strength / DUEL.gustRefSpeed) * falloff)
      if (p < 0.03) continue
      const rx = dx / dist
      const rz = dz / dist

      if (import.meta.env.DEV) console.debug('[gust] target:', { dist, p })

      // Unstick from the ground so the tip rotation isn't ground away.
      other.setTranslation(
        { x: opos.x, y: opos.y + DUEL.gustPreLift, z: opos.z },
        true
      )
      const mass = other.mass()
      other.applyImpulse(
        {
          x: rx * DUEL.gustSlide * p * mass,
          y: DUEL.gustLift * p * mass,
          z: rz * DUEL.gustSlide * p * mass,
        },
        true
      )
      // Tip about the horizontal axis perpendicular to the blast (ŷ × r̂):
      // lifts the near edge, tips the chip away from the impact.
      const w = DUEL.gustTipOmega * p
      other.setAngvel({ x: rz * w, y: 0, z: -rx * w }, true)
    }
  }

  // --- Per-frame: flip readout, slam/settle (attacker), wobble (defender) ---
  const restTimeRef = useRef(0)
  const flightTimeRef = useRef(0)
  const slowmoTimeRef = useRef(0)
  const quatRef = useRef(new THREE.Quaternion())
  const upRef = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const body = bodyRef.current
    if (!body) return
    const store = useDuelStore.getState()

    const rot = body.rotation()
    quatRef.current.set(rot.x, rot.y, rot.z, rot.w)
    upRef.current.copy(UP).applyQuaternion(quatRef.current)
    const upY = upRef.current.y
    const flipped = upY < 0
    store.setFlipped(role, flipped)

    const isThrower = store.lastThrow?.attacker === role

    if (phase === 'flight' && isThrower) {
      // Slam detection: the frame the chip abruptly stops falling.
      if (!gustFiredRef.current) {
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

      // Settle: everything at rest (or timeout) → referee the outcome.
      flightTimeRef.current += delta
      const v = body.linvel()
      const speed = Math.hypot(v.x, v.y, v.z)
      // Wait for the defender to stop moving too, or a teetering chip
      // could be refereed mid-wobble.
      let defenderSpeed = 0
      for (const [, other] of otherChips(role)) {
        const ov = other.linvel()
        defenderSpeed = Math.max(defenderSpeed, Math.hypot(ov.x, ov.y, ov.z))
      }
      const allResting = speed < DUEL.restSpeed && defenderSpeed < DUEL.restSpeed
      restTimeRef.current = allResting ? restTimeRef.current + delta : 0
      if (
        restTimeRef.current >= DUEL.restDuration ||
        flightTimeRef.current >= DUEL.flightTimeout
      ) {
        restTimeRef.current = 0
        flightTimeRef.current = 0
        store.setTimeScale(1)
        store.resolveOutcome()
      }
      return
    }

    if (phase === 'flight' && !isThrower) {
      // Defender: wobble slow-mo near the tipping point — THE clip moment.
      const tilted = upY > 0 && upY < DUEL.wobbleEnter
      const budgetLeft = slowmoTimeRef.current < DUEL.slowmoMaxSec
      if (tilted && budgetLeft && store.slam !== null) {
        store.setTimeScale(DUEL.slowmoScale)
        slowmoTimeRef.current += delta / DUEL.slowmoScale
      } else if (
        store.timeScale !== 1 &&
        (upY >= DUEL.wobbleExit || flipped || !budgetLeft)
      ) {
        store.setTimeScale(1)
      }
      return
    }

    // Out of flight: reset per-throw accumulators
    restTimeRef.current = 0
    flightTimeRef.current = 0
    slowmoTimeRef.current = 0
  })

  const isPlayer = role === 'player'
  const topColor = isPlayer ? '#e8b23a' : '#4a90d9'
  const bottomColor = isPlayer ? '#8a5a10' : '#142a42'
  const sideColor = isPlayer ? '#c98f1f' : '#2f6cab'

  return (
    <RigidBody
      ref={bodyRef}
      type={inHand ? 'kinematicPosition' : 'dynamic'}
      colliders={false}
      position={isPlayer ? handPos : groundStart}
      mass={DUEL.chipMass}
      restitution={DUEL.chipRestitution}
      friction={DUEL.chipFriction}
      linearDamping={0.5}
      angularDamping={0.2}
      ccd
    >
      <CylinderCollider args={[DUEL.chipThickness / 2, DUEL.chipRadius]} />
      <mesh castShadow receiveShadow>
        <cylinderGeometry
          args={[DUEL.chipRadius, DUEL.chipRadius, DUEL.chipThickness, DUEL.chipSegments]}
        />
        {/* [side, top, bottom] — top and bottom contrast hard so a flip reads instantly */}
        <meshStandardMaterial attach="material-0" color={sideColor} flatShading roughness={0.7} />
        <meshStandardMaterial attach="material-1" color={topColor} flatShading roughness={0.6} />
        <meshStandardMaterial attach="material-2" color={bottomColor} flatShading roughness={0.6} />
      </mesh>
    </RigidBody>
  )
}
