import { useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { DUEL } from './duelConstants'
import { useDuelStore } from './duelStore'
import { DuelChip } from './DuelChip'
import { GustRing } from './GustRing'

const CAM_HOME = new THREE.Vector3(0, 3.6, 5.8)
const CAM_HOME_TARGET = new THREE.Vector3(0, 0.1, -0.6)
// Wobble slow-mo: push in low over the defender chip
const CAM_WOBBLE = new THREE.Vector3(0, 1.7, 1.9)
const CAM_WOBBLE_TARGET = new THREE.Vector3(
  DUEL.defenderPos[0],
  0.1,
  DUEL.defenderPos[2]
)

/** Over-the-shoulder camera; pushes in low when the defender chip teeters. */
function CameraRig() {
  const camera = useThree((s) => s.camera)
  const targetRef = useRef(CAM_HOME_TARGET.clone())

  useEffect(() => {
    camera.position.copy(CAM_HOME)
    camera.lookAt(CAM_HOME_TARGET)
  }, [camera])

  useFrame(() => {
    const slowmo = useDuelStore.getState().timeScale < 1
    const wantPos = slowmo ? CAM_WOBBLE : CAM_HOME
    const wantTarget = slowmo ? CAM_WOBBLE_TARGET : CAM_HOME_TARGET
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
        <DuelChip role="defender" />
        <DuelChip role="attacker" />
      </Physics>

      <ChalkCircle />
      <GustRing />
    </Canvas>
  )
}
