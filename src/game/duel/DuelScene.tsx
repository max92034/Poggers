import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { DUEL } from './duelConstants'
import { DuelChip } from './DuelChip'

/** Fixed low-angle camera looking over the player's shoulder at the circle. */
function CameraRig() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    camera.position.set(0, 3.6, 5.8)
    camera.lookAt(0, 0.1, -0.6)
  }, [camera])
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

      <Physics gravity={[0, -9.81, 0]} timeStep="vary">
        <Ground />
        <DuelChip role="defender" />
        <DuelChip role="attacker" />
      </Physics>

      <ChalkCircle />
    </Canvas>
  )
}
