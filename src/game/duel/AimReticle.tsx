import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DUEL } from './duelConstants'
import { useDuelStore, handPosFor } from './duelStore'

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

/**
 * Ground reticle for the aim phase: a small ring at the intended slam
 * point plus a faint circle previewing the gust radius, so the player can
 * see which chips a slam there would touch.
 */
export function AimReticle() {
  const camera = useThree((s) => s.camera)
  const groupRef = useRef<THREE.Group>(null)
  const lockedRef = useRef<THREE.Group>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const hitRef = useRef(new THREE.Vector3())
  const ndcRef = useRef(new THREE.Vector2())

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const s = useDuelStore.getState()

    // Locked target marker (solid) — where the throw will actually go.
    const locked = lockedRef.current
    if (locked) {
      locked.visible =
        s.phase === 'ready' && s.currentTurn === 'player' && !!s.lockedAim
      if (s.lockedAim) locked.position.set(s.lockedAim.x, 0.006, s.lockedAim.z)
    }

    const aiming = s.phase === 'ready' && s.currentTurn === 'player' && s.pointerNdc
    group.visible = !!aiming
    if (!aiming || !s.pointerNdc) return

    ndcRef.current.set(s.pointerNdc.x, s.pointerNdc.y)
    raycaster.current.setFromCamera(ndcRef.current, camera)
    if (!raycaster.current.ray.intersectPlane(GROUND, hitRef.current)) return

    // Clamp: inside the circle, and not right at your own feet.
    let x = hitRef.current.x
    let z = hitRef.current.z
    const rc = Math.hypot(x, z)
    if (rc > DUEL.circleRadius - 0.1) {
      const k = (DUEL.circleRadius - 0.1) / rc
      x *= k
      z *= k
    }
    const hand = handPosFor('player')
    const dh = Math.hypot(x - hand[0], z - hand[2])
    if (dh < DUEL.aimMinDist) {
      const k = DUEL.aimMinDist / (dh || 1)
      x = hand[0] + (x - hand[0]) * k
      z = hand[2] + (z - hand[2]) * k
    }

    group.position.set(x, 0.005, z)
    useDuelStore.getState().setAimPoint(x, z)
  })

  return (
    <>
      {/* hover preview: follows the cursor, faint */}
      <group ref={groupRef} visible={false}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.1, 0.16, 24]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[DUEL.gustRadius - 0.02, DUEL.gustRadius, 48]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      </group>
      {/* locked target: tap to place, the throw goes here */}
      <group ref={lockedRef} visible={false}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.08, 0.18, 24]} />
          <meshBasicMaterial color="#5ce88a" transparent opacity={0.95} depthWrite={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[DUEL.gustRadius - 0.03, DUEL.gustRadius, 48]} />
          <meshBasicMaterial color="#5ce88a" transparent opacity={0.25} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}
