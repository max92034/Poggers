import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, ConvexHullCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { DUEL } from './duelConstants'
import { useDuelStore, handPosFor, type DuelSide, type ChipParams } from './duelStore'
import { registerChip, unregisterChip, getChip } from './chipRegistry'
import { makeChipGeometry, makeChipHullPoints, chipHeight } from './chipGeometry'

interface DuelChipProps {
  chipId: string
  side: DuelSide
  index: number
}

const UP = new THREE.Vector3(0, 1, 0)
const PARKED_Y = 50

/** How much of an incoming gust this chip's shape catches (0.15..~1.2). */
function gustExposure(params: ChipParams): number {
  return Math.max(
    DUEL.minExposure,
    1 -
      DUEL.camberExposureShield * params.camber +
      DUEL.thicknessExposureLip * (params.thickness - 1)
  )
}

function pileSlot(side: DuelSide, rank: number): [number, number, number] {
  const sign = side === 'player' ? 1 : -1
  // Generous slot spacing — chip heights vary by type (kinematic bodies
  // don't resolve overlaps, so leave room for the tallest).
  return [
    DUEL.pilePos[0] * sign,
    DUEL.chipThickness + rank * DUEL.chipThickness * 2.2,
    DUEL.pilePos[1] * sign,
  ]
}

function antePos(side: DuelSide): [number, number, number] {
  const sign = side === 'player' ? 1 : -1
  return [DUEL.anteOffsetX * sign, DUEL.chipThickness / 2 + 0.005, DUEL.anteOffsetZ * sign]
}

/**
 * One chip. Lifecycle: pile (kinematic, stacked beside the ring) → hand
 * (kinematic hover when it's next to throw) → field (dynamic, stays where
 * it lands, a live target) → captured/lost (parked out of sight).
 */
export function DuelChip({ chipId, side, index }: DuelChipProps) {
  const bodyRef = useRef<RapierRigidBody>(null)

  const phase = useDuelStore((s) => s.phase)
  const currentTurn = useDuelStore((s) => s.currentTurn)
  const throwId = useDuelStore((s) => s.throwId)
  const resetId = useDuelStore((s) => s.resetId)
  const status = useDuelStore(
    (s) => s.chips.find((c) => c.id === chipId)?.status ?? 'stack'
  )
  const stackRank = useDuelStore((s) => {
    const mine = s.chips.filter((c) => c.side === side && c.status === 'stack')
    return mine.findIndex((c) => c.id === chipId)
  })
  const isNextToThrow = stackRank === 0
  const isActive = useDuelStore((s) => s.activeChipId === chipId)
  // May be briefly undefined while a smaller lineup replaces the chips
  // array and this component is about to unmount.
  const params = useDuelStore((s) => s.chips.find((c) => c.id === chipId)?.params)
  // Subscribe to my side's stance so the in-hand chip follows it live.
  const myStance = useDuelStore((s) =>
    side === 'player' ? s.playerStance : s.aiStance
  )

  const inHand =
    status === 'stack' &&
    isNextToThrow &&
    currentTurn === side &&
    (phase === 'ready' || phase === 'ai_think')

  // --- Registry ---
  useEffect(() => {
    const body = bodyRef.current
    if (body) registerChip(chipId, body)
    return () => unregisterChip(chipId)
  }, [chipId])

  // --- Placement for non-field states (pile / hand / parked / ante) ---
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    let pos: [number, number, number] | null = null
    if (status === 'captured' || status === 'lost') {
      pos = [index * 2, PARKED_Y, side === 'player' ? 5 : -5]
    } else if (status === 'stack') {
      pos = inHand ? handPosFor(side) : pileSlot(side, Math.max(0, stackRank))
    } else if (status === 'field' && !isActive && index === 0) {
      // Ante chip: placed in the ring at duel start (resetId in deps).
      pos = antePos(side)
    }
    if (!pos) return
    body.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true)
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, inHand, stackRank, resetId, myStance])

  // --- Launch ---
  useEffect(() => {
    if (throwId === 0 || !isActive) return
    const body = bodyRef.current
    const params = useDuelStore.getState().lastThrow
    if (!body || !params || params.chipId !== chipId) return

    const { dirX, dirZ, speed, straightness } = params
    const hand = handPosFor(side)

    body.setTranslation({ x: hand[0], y: hand[1], z: hand[2] }, true)
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
  }, [throwId, isActive])

  // --- Gust (thrower only) ---
  const gustFiredRef = useRef(false)
  const prevVelRef = useRef(new THREE.Vector3())
  useEffect(() => {
    gustFiredRef.current = false
  }, [throwId, resetId])

  const fireGust = () => {
    const body = bodyRef.current
    if (!body || !params || gustFiredRef.current) return
    gustFiredRef.current = true

    const store = useDuelStore.getState()
    const impactSpeed = prevVelRef.current.length()
    const rot = body.rotation()
    const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    // A domed chip cannot land flat — its gust output suffers.
    const flatness =
      Math.abs(up.y) * (1 - DUEL.camberFlatnessPenalty * params.camber)

    const pos = body.translation()
    // Heavier chips carry more momentum into the slap → bigger gust.
    const strength =
      flatness < DUEL.gustMinFlatness
        ? 0
        : impactSpeed * flatness * flatness * params.weight

    if (import.meta.env.DEV)
      console.debug('[gust] fired:', { impactSpeed, flatness, strength })
    store.recordSlam(pos.x, pos.z, Math.min(1, strength / DUEL.gustRefSpeed))

    // The slap eats the thrower's momentum: flat slam ≈ dead stop.
    const keep = DUEL.slamVelocityKeep + (1 - flatness) * 0.4
    const v = body.linvel()
    body.setLinvel({ x: v.x * keep, y: 0, z: v.z * keep }, true)
    if (strength <= 0) return

    // Blast every OTHER live field chip in range.
    for (const c of store.chips) {
      if (c.id === chipId || c.status !== 'field') continue
      const other = getChip(c.id)
      if (!other) continue
      const opos = other.translation()
      const dx = opos.x - pos.x
      const dz = opos.z - pos.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.01 || dist > DUEL.gustRadius) continue
      if (opos.y > DUEL.chipRadius) continue

      const falloff = 1 - dist / DUEL.gustRadius
      // Target shape decides how much of the blast its rim catches.
      const p = Math.min(
        1.2,
        (strength / DUEL.gustRefSpeed) * falloff * gustExposure(c.params)
      )
      if (p < 0.03) continue
      const rx = dx / dist
      const rz = dz / dist

      if (import.meta.env.DEV) console.debug('[gust] target:', { id: c.id, dist, p })

      // Upward impulse at the NEAR edge (the rim facing the blast). The
      // solver resolves this into a pivot about the grounded far edge —
      // the physically correct flip motion. (Setting angvel about the
      // center instead drives the far edge INTO the ground and the
      // contact solver eats the rotation.)
      other.setTranslation(
        { x: opos.x, y: opos.y + DUEL.gustPreLift, z: opos.z },
        true
      )
      // Saturate at the target's somersault boundary (scaled by its weight):
      // past "decisive flip" extra power does nothing — monotone outcomes.
      const J = Math.min(
        DUEL.gustEdgeImpulseBase + DUEL.gustEdgeImpulseScale * p,
        DUEL.gustJSomersault * c.params.weight
      )
      const nearEdge = {
        x: opos.x - rx * DUEL.chipRadius,
        y: opos.y,
        z: opos.z - rz * DUEL.chipRadius,
      }
      other.applyImpulseAtPoint(
        { x: rx * J * DUEL.gustSlide, y: J, z: rz * J * DUEL.gustSlide },
        nearEdge,
        true
      )
    }
  }

  // --- Per-frame: slam/settle (thrower), wobble slow-mo (field chips) ---
  const restTimeRef = useRef(0)
  const flightTimeRef = useRef(0)
  const slowmoTimeRef = useRef(0)
  const quatRef = useRef(new THREE.Quaternion())
  const upRef = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const body = bodyRef.current
    if (!body) return
    const store = useDuelStore.getState()

    if (phase === 'flight' && isActive) {
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

      // Settle: this chip AND every field chip at rest → referee.
      flightTimeRef.current += delta
      let maxSpeed = 0
      for (const c of store.chips) {
        if (c.status !== 'field') continue
        const b = getChip(c.id)
        if (!b) continue
        const v = b.linvel()
        maxSpeed = Math.max(maxSpeed, Math.hypot(v.x, v.y, v.z))
      }
      restTimeRef.current =
        maxSpeed < DUEL.restSpeed ? restTimeRef.current + delta : 0
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

    // Once a field chip passes its tipping point it should lie DOWN, not
    // keep rolling on its rim like a wheel (a lens rolls freely — without
    // this the final face is spin parity, i.e. a coin toss).
    if (status === 'field' && !isActive) {
      const rot0 = body.rotation()
      const upY0 = 1 - 2 * (rot0.x * rot0.x + rot0.z * rot0.z)
      if (upY0 < -0.3) {
        const av = body.angvel()
        if (Math.hypot(av.x, av.y, av.z) > 1.5) {
          body.setAngvel({ x: av.x * 0.8, y: av.y * 0.8, z: av.z * 0.8 }, true)
        }
      }
    }

    if (phase === 'flight' && status === 'field' && !isActive) {
      const rot = body.rotation()
      quatRef.current.set(rot.x, rot.y, rot.z, rot.w)
      upRef.current.copy(UP).applyQuaternion(quatRef.current)
      const upY = upRef.current.y

      // Wobble slow-mo when teetering near the tipping point.
      const tilted = upY > 0 && upY < DUEL.wobbleEnter
      const budgetLeft = slowmoTimeRef.current < DUEL.slowmoMaxSec
      if (tilted && budgetLeft && store.slam !== null) {
        store.setTimeScale(DUEL.slowmoScale, chipId)
        slowmoTimeRef.current += delta / DUEL.slowmoScale
      } else if (
        store.wobbleChipId === chipId &&
        (upY >= DUEL.wobbleExit || upY < 0 || !budgetLeft)
      ) {
        store.setTimeScale(1)
      }
      return
    }

    restTimeRef.current = 0
    flightTimeRef.current = 0
    if (phase !== 'flight') slowmoTimeRef.current = 0
  })

  const isPlayer = side === 'player'
  // Type-tinted side colors: White-Out chips pale (crusted), Warped scorched.
  const baseTop = isPlayer ? '#e8b23a' : '#4a90d9'
  const topColor =
    params?.label === 'White-Out'
      ? isPlayer
        ? '#f2d58a'
        : '#9cc3ea'
      : params?.label === 'Warped'
      ? isPlayer
        ? '#c98436'
        : '#3a6f9e'
      : baseTop
  const bottomColor = isPlayer ? '#8a5a10' : '#142a42'
  const hidden = status === 'captured' || status === 'lost'

  const geometry = useMemo(
    () => (params ? makeChipGeometry(params) : undefined),
    [params]
  )
  const hullPoints = useMemo(
    () => (params ? makeChipHullPoints(params) : undefined),
    [params]
  )

  if (!params || !geometry || !hullPoints) return null

  return (
    <RigidBody
      ref={bodyRef}
      type={status === 'field' ? 'dynamic' : 'kinematicPosition'}
      colliders={false}
      position={index === 0 ? antePos(side) : pileSlot(side, index - 1)}
      mass={DUEL.chipMass * params.weight}
      restitution={DUEL.chipRestitution}
      friction={DUEL.chipFriction}
      linearDamping={0.5}
      angularDamping={0.25}
      ccd
    >
      <ConvexHullCollider args={[hullPoints]} />
      <group visible={!hidden}>
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial color={topColor} flatShading roughness={0.6} />
        </mesh>
        {/* Thin bottom disc in the owner's dark color so face-down reads instantly */}
        <mesh position-y={-chipHeight(params) / 2 + 0.002} rotation-x={Math.PI / 2}>
          <circleGeometry args={[DUEL.chipRadius * 0.985, DUEL.chipSegments]} />
          <meshStandardMaterial color={bottomColor} flatShading roughness={0.6} side={THREE.BackSide} />
        </mesh>
      </group>
    </RigidBody>
  )
}
