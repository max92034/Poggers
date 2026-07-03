import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { ARENA } from './constants'

const RADIUS = ARENA.colosseumRadius
const HEIGHT = ARENA.colosseumWallHeight
const THICKNESS = ARENA.colosseumWallThickness
const SEGMENTS = ARENA.colosseumSegments

/**
 * A circular arena wall beneath/around the pog stacks.
 *
 * - Visual: transparent ring with a white outline.
 * - Physics: a ring of thin cuboid colliders that act as a low bumper wall.
 * - Ring-out rule: pogs that flip outside this ring do not score.
 */
export function Colosseum() {
  const segments = Array.from({ length: SEGMENTS }, (_, i) => {
    const theta0 = (i / SEGMENTS) * Math.PI * 2
    const theta1 = ((i + 1) / SEGMENTS) * Math.PI * 2
    const mid = (theta0 + theta1) / 2
    const x = Math.cos(mid) * RADIUS
    const z = Math.sin(mid) * RADIUS
    const yaw = mid + Math.PI / 2
    return { x, z, yaw }
  })

  return (
    <group>
      {/* Transparent wall body */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HEIGHT / 2, 0]}>
        <ringGeometry args={[RADIUS - THICKNESS, RADIUS, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>

      {/* Inner edge outline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HEIGHT / 2, 0]}>
        <ringGeometry args={[RADIUS - THICKNESS, RADIUS - THICKNESS + 0.02, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer edge outline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HEIGHT / 2, 0]}>
        <ringGeometry args={[RADIUS - 0.02, RADIUS, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Vertical pillar segments - gives it a colosseum look */}
      {segments.map((seg, i) => (
        <mesh key={`pillar-${i}`} position={[seg.x, HEIGHT / 2, seg.z]} rotation={[0, seg.yaw, 0]}>
          <boxGeometry args={[0.012, HEIGHT, THICKNESS]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Top rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HEIGHT, 0]}>
        <ringGeometry args={[RADIUS - THICKNESS, RADIUS, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Physics colliders: a ring of low walls */}
      <RigidBody type="fixed" colliders={false} friction={0.4} restitution={0.5}>
        {segments.map((seg, i) => {
          const halfLength = (Math.PI * 2 * RADIUS) / SEGMENTS / 2
          return (
            <CuboidCollider
              key={`collider-${i}`}
              args={[halfLength, HEIGHT / 2, THICKNESS / 2]}
              position={[seg.x, HEIGHT / 2, seg.z]}
              rotation={[0, seg.yaw, 0]}
            />
          )
        })}
      </RigidBody>
    </group>
  )
}
