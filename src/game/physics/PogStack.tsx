import { ARENA } from './constants'
import { PogDisc } from './PogDisc'
import type { Character } from '../characters/types'

interface PogStackProps {
  // All pogs in the stack use the same neutral look (a generic "cap" texture or palette).
  // For MVP we tint them with a neutral palette so they read as a stack of blank pogs.
  neutralPalette: { primary: string; secondary: string; accent: string }
  playerChar: Character
  aiChar: Character
  shotId: number
}

/**
 * Renders the 8-pog neutral stack at the center, plus the player's main pog
 * on the +z side and the AI's main pog on the -z side.
 */
export function PogStack({ neutralPalette, playerChar, aiChar, shotId }: PogStackProps) {
  const stack: { id: string; x: number; y: number; z: number; rotY: number }[] = []
  const baseY = ARENA.stackHeight / 2
  for (let i = 0; i < ARENA.stackCount; i++) {
    const y = baseY + i * (ARENA.stackHeight + ARENA.stackGap)
    const angle = Math.random() * Math.PI * 2
    const offsetMag = Math.random() * 0.03 * (i / ARENA.stackCount + 0.5)
    stack.push({
      id: `stack-${i}`,
      x: Math.cos(angle) * offsetMag,
      y,
      z: Math.sin(angle) * offsetMag,
      rotY: Math.random() * Math.PI * 2,
    })
  }

  return (
    <group>
      {stack.map((p) => (
        <PogDisc
          key={p.id}
          id={p.id}
          position={[p.x, p.y, p.z]}
          rotation={[0, p.rotY, 0]}
          charId="neutral"
          palette={neutralPalette}
          shotId={shotId}
        />
      ))}

      {/* Player main pog (south side, +z) */}
      <PogDisc
        id="main-player"
        position={[0, ARENA.stackHeight * 0.7, ARENA.mainPogOffset]}
        charId={playerChar.id}
        palette={playerChar.palette}
        isMain
        mainSide="player"
        shotId={shotId}
      />

      {/* AI main pog (north side, -z) */}
      <PogDisc
        id="main-ai"
        position={[0, ARENA.stackHeight * 0.7, -ARENA.mainPogOffset]}
        charId={aiChar.id}
        palette={aiChar.palette}
        isMain
        mainSide="ai"
        shotId={shotId}
      />
    </group>
  )
}
