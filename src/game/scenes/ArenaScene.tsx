import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ARENA } from '../physics/constants'
import { PogStack } from '../physics/PogStack'
import { Slammer } from '../physics/Slammer'
import { useGameStore } from '../store/gameStore'
import { getCharacter } from '../characters/roster'
import { chooseAiShot } from '../ai/aiBrain'

const NEUTRAL_PALETTE = { primary: '#3a4254', secondary: '#5a6478', accent: '#252a36' }

function ArenaFloor() {
  const half = ARENA.floorSize / 2
  return (
    <RigidBody type="fixed" colliders={false} friction={ARENA.floorFriction} restitution={ARENA.floorRestitution}>
      <CuboidCollider args={[half, 0.05, half]} position={[0, -0.05, 0]} />
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ARENA.floorSize, ARENA.floorSize]} />
        <meshStandardMaterial color="#1a1f2c" roughness={0.85} />
      </mesh>
      {/* Subtle grid pattern via a second plane */}
      <gridHelper args={[ARENA.floorSize, 12, '#2a3142', '#222634']} position={[0, 0.001, 0]} />
      {/* Contact shadow under the stack so it doesn't float visually */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 32]} />
        <meshBasicMaterial color="#05070a" transparent opacity={0.55} />
      </mesh>
    </RigidBody>
  )
}

/** Four invisible walls around the arena so pogs don't fly off forever. */
function ArenaWalls() {
  const half = ARENA.floorSize / 2
  const wallHeight = 2
  const wallThickness = 0.2
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[0, wallHeight / 2, half]}>
        <CuboidCollider args={[half, wallHeight / 2, wallThickness / 2]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} position={[0, wallHeight / 2, -half]}>
        <CuboidCollider args={[half, wallHeight / 2, wallThickness / 2]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} position={[half, wallHeight / 2, 0]}>
        <CuboidCollider args={[wallThickness / 2, wallHeight / 2, half]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} position={[-half, wallHeight / 2, 0]}>
        <CuboidCollider args={[wallThickness / 2, wallHeight / 2, half]} />
      </RigidBody>
    </>
  )
}

/** Thin line showing predicted aim direction during player_aim phase. */
function AimLine({ aimAngle, side }: { aimAngle: number; side: 'player' | 'ai' }) {
  const zSign = side === 'player' ? 1 : -1
  const spawn = new THREE.Vector3(0, ARENA.slammerSpawnHeight, zSign * 0.1)
  const aimTarget = new THREE.Vector3(
    Math.sin(aimAngle) * ARENA.slammerAimRadius,
    ARENA.slammerTargetHeight,
    Math.cos(aimAngle) * ARENA.slammerAimRadius * zSign,
  )
  return (
    <Line
      points={[spawn, aimTarget]}
      color="#6ea8ff"
      lineWidth={2}
      dashed
      dashSize={0.2}
      gapSize={0.15}
    />
  )
}

/** Marker showing where the slammer will spawn during aim phase. */
function AimMarker({ side }: { side: 'player' | 'ai' }) {
  const zSign = side === 'player' ? 1 : -1
  const pos: [number, number, number] = [0, ARENA.slammerSpawnHeight, zSign * 0.1]
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial color="#6ea8ff" emissive="#6ea8ff" emissiveIntensity={0.6} />
    </mesh>
  )
}

/**
 * Effect that runs inside the Canvas to drive phase transitions:
 *  - intro → player_aim (after a brief delay so the player sees the arena)
 *  - resolving → finishResolving (after a brief delay so the player sees the result)
 *  - ai_thinking → aiLaunch (after the AI's thinking delay)
 */
function PhaseDirector() {
  const phase = useGameStore((s) => s.phase)
  const playerCharId = useGameStore((s) => s.playerCharId)
  const aiCharId = useGameStore((s) => s.aiCharId)
  const beginPlayerTurn = useGameStore((s) => s.beginPlayerTurn)
  const finishResolving = useGameStore((s) => s.finishResolving)
  const aiLaunch = useGameStore((s) => s.aiLaunch)
  const setAim = useGameStore((s) => s.setAim)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (phase === 'intro') {
      timerRef.current = window.setTimeout(() => beginPlayerTurn(), 800)
    } else if (phase === 'resolving') {
      timerRef.current = window.setTimeout(() => finishResolving(), 900)
    } else if (phase === 'ai_thinking') {
      const aiChar = getCharacter(aiCharId)
      const round = useGameStore.getState().round
      // AI thinking delay: ~1.5s
      timerRef.current = window.setTimeout(() => {
        const decision = chooseAiShot(aiChar, round)
        setAim(decision.aimAngle)
        aiLaunch(decision.aimAngle, decision.power)
      }, 1500)
    }

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [phase, playerCharId, aiCharId, beginPlayerTurn, finishResolving, aiLaunch, setAim])

  return null
}

/**
 * Smoothly moves the camera based on phase:
 * - launching → chase the slammer from behind the attacker
 * - all other phases → ease back to overview position [0, 6, 9]
 * Disables itself when OrbitControls should be in charge (non-launching/resolving).
 */
function CameraRig({ slammerRef }: { slammerRef: React.MutableRefObject<RapierRigidBody | null> }) {
  const phase = useGameStore((s) => s.phase)
  const currentTurn = useGameStore((s) => s.currentTurn)
  const { camera } = useThree()
  const lookAtRef = useRef(new THREE.Vector3(0, 0.5, 0))
  const tmpPos = useRef(new THREE.Vector3())
  const tmpLook = useRef(new THREE.Vector3())

  useFrame(() => {
    if (phase === 'launching' && slammerRef.current) {
      const p = slammerRef.current.translation()
      const zOffset = currentTurn === 'player' ? 3.5 : -3.5
      tmpPos.current.set(p.x * 0.5, p.y + 2.5, p.z + zOffset)
      tmpLook.current.set(p.x * 0.5, p.y, p.z)
      camera.position.lerp(tmpPos.current, 0.08)
      lookAtRef.current.lerp(tmpLook.current, 0.08)
      camera.lookAt(lookAtRef.current)
    } else {
      tmpPos.current.set(0, 6, 9)
      tmpLook.current.set(0, 0.5, 0)
      camera.position.lerp(tmpPos.current, 0.06)
      lookAtRef.current.lerp(tmpLook.current, 0.06)
      camera.lookAt(lookAtRef.current)
    }
  })

  return null
}

/**
 * One-shot dust puff at the stack center when the slammer impacts.
 * Mounts during 'launching' phase. Waits a brief delay (slammer travel time),
 * then plays a short outward+upward particle burst that fades over ~0.7s.
 */
const PARTICLE_COUNT = 14
const IMPACT_DELAY = 0.25
const BURST_DURATION = 0.7

function ImpactBurst() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const startTime = useRef(0)
  const velocities = useRef<THREE.Vector3[]>([])
  const dummy = useRef(new THREE.Object3D())

  useEffect(() => {
    const vel: THREE.Vector3[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.4
      const speed = 1.2 + Math.random() * 1.8
      vel.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        1.8 + Math.random() * 2.2,
        Math.sin(angle) * speed,
      ))
    }
    velocities.current = vel
    startTime.current = performance.now() / 1000
  }, [])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh || velocities.current.length === 0) return

    const elapsed = performance.now() / 1000 - startTime.current

    if (elapsed < IMPACT_DELAY) {
      mesh.visible = false
      return
    }

    const t = elapsed - IMPACT_DELAY
    if (t > BURST_DURATION) {
      mesh.visible = false
      return
    }

    mesh.visible = true
    const fade = 1 - t / BURST_DURATION
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const v = velocities.current[i]
      const px = v.x * t
      const py = v.y * t - 0.5 * 5 * t * t
      const pz = v.z * t
      dummy.current.position.set(px, Math.max(0.04, py + 0.3), pz)
      dummy.current.scale.setScalar(0.1 * fade + 0.01)
      dummy.current.updateMatrix()
      mesh.setMatrixAt(i, dummy.current.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    const mat = mesh.material as THREE.MeshBasicMaterial
    mat.opacity = fade * 0.8
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#e2e8f5" transparent opacity={0.8} depthWrite={false} />
    </instancedMesh>
  )
}

interface ArenaSceneProps {
  playerCharId: string
  aiCharId: string
}

export function ArenaScene({ playerCharId, aiCharId }: ArenaSceneProps) {
  const phase = useGameStore((s) => s.phase)
  const currentTurn = useGameStore((s) => s.currentTurn)
  const aimAngle = useGameStore((s) => s.aimAngle)
  const lockedPower = useGameStore((s) => s.lockedPower)
  const shotId = useGameStore((s) => s.shotId)
  const playerItems = useGameStore((s) => s.playerItems)
  const aiItems = useGameStore((s) => s.aiItems)

  const playerChar = getCharacter(playerCharId)
  const aiChar = getCharacter(aiCharId)
  const attackerChar = currentTurn === 'player' ? playerChar : aiChar
  const attackerItems = currentTurn === 'player' ? playerItems : aiItems

  // Baby Oil: whoever has it makes the opponent's pogs slippery during their turn.
  // Player has Baby Oil → AI's turn: AI main pog + stack are slippery.
  // AI has Baby Oil → Player's turn: player main pog + stack are slippery.
  const playerHasBabyOil = playerItems.some((i) => i.id === 'baby-oil')
  const aiHasBabyOil = aiItems.some((i) => i.id === 'baby-oil')

  const stackSlippery =
    (currentTurn === 'ai' && playerHasBabyOil) || (currentTurn === 'player' && aiHasBabyOil)
  const playerMainSlippery = currentTurn === 'player' && aiHasBabyOil
  const aiMainSlippery = currentTurn === 'ai' && playerHasBabyOil

  const slammerBodyRef = useRef<RapierRigidBody>(null)

  const showAim = phase === 'player_aim' || phase === 'player_power' || phase === 'ai_thinking'

  return (
    <Canvas
      shadows
      camera={{ position: [0, 6, 9], fov: 50, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0b0d12']} />
      <fog attach="fog" args={['#0b0d12', 14, 28]} />

      <ambientLight intensity={0.45} />
      <directionalLight
        position={[6, 12, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={40}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-4, 8, -6]} intensity={0.4} color="#8fa8ff" />

      <Physics gravity={[0, -9.81, 0]} timeStep="vary">
        <ArenaFloor />
        <ArenaWalls />

        <PogStack
          neutralPalette={NEUTRAL_PALETTE}
          playerChar={playerChar}
          aiChar={aiChar}
          shotId={shotId}
          stackSlippery={stackSlippery}
          playerMainSlippery={playerMainSlippery}
          aiMainSlippery={aiMainSlippery}
        />

        <Slammer
          attackerChar={attackerChar}
          attackerSide={currentTurn}
          aimAngle={aimAngle}
          lockedPower={lockedPower}
          shotId={shotId}
          items={attackerItems}
          bodyRef={slammerBodyRef}
        />

        <PhaseDirector />
      </Physics>

      {showAim && <AimLine aimAngle={aimAngle} side={currentTurn} />}
      {showAim && <AimMarker side={currentTurn} />}

      <CameraRig slammerRef={slammerBodyRef} />

      {phase === 'launching' && <ImpactBurst />}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={false}
        enabled={phase !== 'launching' && phase !== 'resolving'}
        minDistance={6}
        maxDistance={14}
        target={[0, 0.5, 0]}
      />
    </Canvas>
  )
}
