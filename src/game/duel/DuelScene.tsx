import { useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { DUEL } from './duelConstants'
import { useDuelStore } from './duelStore'
import { getChip } from './chipRegistry'
import { DuelChip } from './DuelChip'
import { GustRing } from './GustRing'
import { AimReticle } from './AimReticle'

const CAM_DIST = 5.8
const CAM_HEIGHT = 3.6

/** Over-the-shoulder camera: orbits with the player's stance, pushes in
 * low when a chip teeters. */
function CameraRig() {
  const camera = useThree((s) => s.camera)
  const homePosRef = useRef(new THREE.Vector3(0, CAM_HEIGHT, CAM_DIST))
  const homeTargetRef = useRef(new THREE.Vector3(0, 0.1, -0.6))
  const targetRef = useRef(new THREE.Vector3(0, 0.1, -0.6))
  const wobbleTargetRef = useRef(new THREE.Vector3())
  const wobblePosRef = useRef(new THREE.Vector3())

  useEffect(() => {
    camera.position.copy(homePosRef.current)
    camera.lookAt(homeTargetRef.current)
  }, [camera])

  useFrame(() => {
    const store = useDuelStore.getState()
    const slowmo = store.timeScale < 1
    // Home framing rotates with the player's stance around the ring.
    const a = store.playerStance
    homePosRef.current.set(Math.sin(a) * CAM_DIST, CAM_HEIGHT, Math.cos(a) * CAM_DIST)
    homeTargetRef.current.set(Math.sin(a) * -0.6, 0.1, Math.cos(a) * -0.6)
    let wantPos: THREE.Vector3 = homePosRef.current
    let wantTarget: THREE.Vector3 = homeTargetRef.current
    if (slowmo && store.wobbleChipId) {
      // Look at the teetering chip, from low on the player's side.
      const body = getChip(store.wobbleChipId)
      if (body) {
        const p = body.translation()
        wobbleTargetRef.current.set(p.x, 0.15, p.z)
        wobblePosRef.current.set(p.x * 0.4, 1.6, p.z + 2.2)
        wantTarget = wobbleTargetRef.current
        wantPos = wobblePosRef.current
      }
    }
    // Snap in fast for the drama, ease back out gently
    const k = slowmo ? 0.12 : 0.05
    camera.position.lerp(wantPos, k)
    targetRef.current.lerp(wantTarget, k)
    camera.lookAt(targetRef.current)
  })
  return null
}

function Ground() {
  return (
    <RigidBody type="fixed" colliders={false} friction={DUEL.groundFriction} restitution={DUEL.groundRestitution}>
      <CuboidCollider args={[DUEL.groundSize / 2, 0.05, DUEL.groundSize / 2]} position={[0, -0.05, 0]} />
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[DUEL.groundSize, 0.1, DUEL.groundSize]} />
        <meshStandardMaterial color="#8d8a82" flatShading roughness={0.95} />
      </mesh>
    </RigidBody>
  )
}

/** The chalk circle — visual ring-out boundary (rules attach in checkpoint 3). */
function ChalkCircle() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
      <ringGeometry args={[DUEL.circleRadius - 0.06, DUEL.circleRadius + 0.06, 64]} />
      <meshBasicMaterial color="#efe9d8" transparent opacity={0.85} />
    </mesh>
  )
}

export function DuelScene() {
  const hitstop = useDuelStore((s) => s.hitstop)
  const timeScale = useDuelStore((s) => s.timeScale)
  const chipList = useDuelStore((s) => s.chips)
  return (
    <Canvas
      shadows
      camera={{ fov: 42, near: 0.1, far: 100 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#1a1e28']} />
      <CameraRig />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[4, 8, 3]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />

      <Physics
        gravity={[0, -9.81, 0]}
        // Slow-mo: advance less sim time per rendered frame while the
        // defender teeters. Hitstop: freeze entirely for a few frames.
        timeStep={timeScale === 1 ? 'vary' : (1 / 60) * timeScale}
        paused={hitstop}
      >
        <Ground />
        {chipList.map((c) => (
          <DuelChip key={c.id} chipId={c.id} side={c.side} index={c.index} />
        ))}
      </Physics>

      <ChalkCircle />
      <GustRing />
      <AimReticle />
    </Canvas>
  )
}
