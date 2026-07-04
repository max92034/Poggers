import { create } from 'zustand'
import { DUEL } from './duelConstants'
import { getChip } from './chipRegistry'
import { speedForRange } from './ballistics'

export type DuelSide = 'player' | 'ai'
export type ChipStatus = 'stack' | 'field' | 'captured' | 'lost'
export type DuelPhase =
  | 'ready'     // player may aim + flick
  | 'ai_think'  // rival is lining up its throw
  | 'flight'    // chip thrown, physics running
  | 'gameover'  // duel decided

export type WinReason = 'captures' | 'wipeout' | 'draw'

export interface ChipState {
  id: string
  side: DuelSide
  index: number // 0..stackSize-1; 0 is the ante chip
  status: ChipStatus
}

export interface ThrowParams {
  attacker: DuelSide
  chipId: string
  dirX: number
  dirZ: number
  speed: number         // actual launch speed, m/s
  requiredSpeed: number // speed that would land exactly on the aim point
  straightness: number
}

export interface SlamEvent {
  id: number
  x: number
  z: number
  strength: number
}

function makeChips(): ChipState[] {
  const chips: ChipState[] = []
  for (const side of ['player', 'ai'] as DuelSide[]) {
    for (let i = 0; i < DUEL.stackSize; i++) {
      chips.push({
        id: `${side}-${i}`,
        side,
        index: i,
        status: i === 0 ? 'field' : 'stack', // chip 0 = ante, already in the ring
      })
    }
  }
  return chips
}

export function handPosFor(side: DuelSide): [number, number, number] {
  const sign = side === 'player' ? 1 : -1
  return [DUEL.spawnPos[0], DUEL.spawnPos[1], DUEL.spawnPos[2] * sign]
}

interface DuelState {
  phase: DuelPhase
  currentTurn: DuelSide
  chips: ChipState[]
  activeChipId: string | null // the chip currently in flight
  throwId: number
  resetId: number
  lastThrow: ThrowParams | null

  // Aim (player turn): pointer NDC written by the input overlay, world
  // aim point written back by the reticle component inside the canvas.
  pointerNdc: { x: number; y: number } | null
  aimPoint: { x: number; z: number } | null   // live preview under the cursor
  lockedAim: { x: number; z: number } | null  // tapped-in target the throw uses

  winner: DuelSide | null
  winReason: WinReason | null
  playerCaptured: number // chips captured THIS duel
  aiCaptured: number
  playerChipsWon: number // session tally
  aiChipsWon: number

  // Juice
  slam: SlamEvent | null
  hitstop: boolean
  timeScale: number
  wobbleChipId: string | null

  setPointerNdc: (x: number, y: number) => void
  setAimPoint: (x: number, z: number) => void
  lockAim: () => void
  throwChip: (flick: { speed: number; straightness: number }) => void
  aiThrow: (params: {
    aimX: number
    aimZ: number
    speed: number
    straightness: number
  }) => void
  resolveOutcome: () => void
  nextDuel: () => void
  recordSlam: (x: number, z: number, strength: number) => void
  setTimeScale: (scale: number, wobbleChipId?: string | null) => void
}

let slamIdCounter = 1
let hitstopTimer: ReturnType<typeof setTimeout> | null = null

function nextStackChip(chips: ChipState[], side: DuelSide): ChipState | undefined {
  return chips.find((c) => c.side === side && c.status === 'stack')
}

/** Build launch params from an aim point + flick quality for `side`. */
function buildThrow(
  side: DuelSide,
  chipId: string,
  aimX: number,
  aimZ: number,
  speed: number,
  straightness: number
): ThrowParams {
  const hand = handPosFor(side)
  let dx = aimX - hand[0]
  let dz = aimZ - hand[2]
  const dist = Math.hypot(dx, dz) || 1
  dx /= dist
  dz /= dist
  // A crooked snap also pulls the direction off-line.
  const err = (1 - straightness) * DUEL.lateralErrRad * (Math.random() * 2 - 1)
  const cosE = Math.cos(err)
  const sinE = Math.sin(err)
  const dirX = dx * cosE - dz * sinE
  const dirZ = dx * sinE + dz * cosE
  return {
    attacker: side,
    chipId,
    dirX,
    dirZ,
    speed: Math.max(DUEL.minSpeed, Math.min(DUEL.maxSpeed, speed)),
    requiredSpeed: speedForRange(dist),
    straightness,
  }
}

export const useDuelStore = create<DuelState>((set, get) => ({
  phase: 'ready',
  currentTurn: 'player',
  chips: makeChips(),
  activeChipId: null,
  throwId: 0,
  resetId: 0,
  lastThrow: null,
  pointerNdc: null,
  aimPoint: null,
  lockedAim: null,
  winner: null,
  winReason: null,
  playerCaptured: 0,
  aiCaptured: 0,
  playerChipsWon: 0,
  aiChipsWon: 0,
  slam: null,
  hitstop: false,
  timeScale: 1,
  wobbleChipId: null,

  setPointerNdc: (x, y) => set({ pointerNdc: { x, y } }),
  setAimPoint: (x, z) => {
    const a = get().aimPoint
    if (!a || Math.abs(a.x - x) > 1e-4 || Math.abs(a.z - z) > 1e-4)
      set({ aimPoint: { x, z } })
  },

  lockAim: () => {
    const s = get()
    if (s.phase !== 'ready' || s.currentTurn !== 'player' || !s.aimPoint) return
    set({ lockedAim: { ...s.aimPoint } })
  },

  throwChip: (flick) => {
    const s = get()
    if (s.phase !== 'ready' || s.currentTurn !== 'player' || !s.lockedAim) return
    const chip = nextStackChip(s.chips, 'player')
    if (!chip) return
    const params = buildThrow(
      'player',
      chip.id,
      s.lockedAim.x,
      s.lockedAim.z,
      flick.speed,
      flick.straightness
    )
    set({
      phase: 'flight',
      throwId: s.throwId + 1,
      activeChipId: chip.id,
      lastThrow: params,
      chips: s.chips.map((c) =>
        c.id === chip.id ? { ...c, status: 'field' as ChipStatus } : c
      ),
    })
  },

  aiThrow: ({ aimX, aimZ, speed, straightness }) => {
    const s = get()
    if (s.phase !== 'ai_think' || s.currentTurn !== 'ai') return
    const chip = nextStackChip(s.chips, 'ai')
    if (!chip) return
    const params = buildThrow('ai', chip.id, aimX, aimZ, speed, straightness)
    set({
      phase: 'flight',
      throwId: s.throwId + 1,
      activeChipId: chip.id,
      lastThrow: params,
      chips: s.chips.map((c) =>
        c.id === chip.id ? { ...c, status: 'field' as ChipStatus } : c
      ),
    })
  },

  // Referee, called when everything settles after a throw:
  // - field chips outside the circle are LOST (out of play, nobody scores)
  // - face-down field chips are CAPTURED by the other side
  // - duel ends when both stacks are empty (compare captures) or one side
  //   has no chips anywhere (wipeout)
  resolveOutcome: () => {
    const s = get()
    if (s.phase !== 'flight') return

    let playerCaptured = s.playerCaptured
    let aiCaptured = s.aiCaptured
    const chips = s.chips.map((c) => {
      if (c.status !== 'field') return c
      const body = getChip(c.id)
      if (!body) return c
      const pos = body.translation()
      if (Math.hypot(pos.x, pos.z) > DUEL.circleRadius) {
        return { ...c, status: 'lost' as ChipStatus }
      }
      const rot = body.rotation()
      // face-down when the local up axis points below the horizon
      const upY = 1 - 2 * (rot.x * rot.x + rot.z * rot.z)
      if (upY < 0) {
        if (c.side === 'player') aiCaptured++
        else playerCaptured++
        return { ...c, status: 'captured' as ChipStatus }
      }
      return c
    })

    const alive = (side: DuelSide) =>
      chips.filter(
        (c) => c.side === side && (c.status === 'stack' || c.status === 'field')
      ).length
    const stackLeft = (side: DuelSide) =>
      chips.filter((c) => c.side === side && c.status === 'stack').length

    const endDuel = (reason: WinReason) => {
      // Mutual wipeout (one throw captures everything) falls back to
      // comparing captures, like stack exhaustion.
      const byCaptures: DuelSide | null =
        playerCaptured > aiCaptured
          ? 'player'
          : aiCaptured > playerCaptured
          ? 'ai'
          : null
      const winner: DuelSide | null =
        reason === 'wipeout' && alive('player') === 0 && alive('ai') > 0
          ? 'ai'
          : reason === 'wipeout' && alive('ai') === 0 && alive('player') > 0
          ? 'player'
          : byCaptures
      set({
        phase: 'gameover',
        chips,
        activeChipId: null,
        playerCaptured,
        aiCaptured,
        winner,
        winReason: winner === null ? 'draw' : reason,
        timeScale: 1,
        wobbleChipId: null,
        playerChipsWon: s.playerChipsWon + playerCaptured,
        aiChipsWon: s.aiChipsWon + aiCaptured,
      })
    }

    if (alive('player') === 0 || alive('ai') === 0) return endDuel('wipeout')
    if (stackLeft('player') === 0 && stackLeft('ai') === 0)
      return endDuel('captures')

    // Pass the turn — alternate, but skip a side with an empty stack.
    const other: DuelSide = s.currentTurn === 'player' ? 'ai' : 'player'
    const next: DuelSide = stackLeft(other) > 0 ? other : s.currentTurn
    set({
      chips,
      activeChipId: null,
      playerCaptured,
      aiCaptured,
      currentTurn: next,
      phase: next === 'ai' ? 'ai_think' : 'ready',
      timeScale: 1,
      wobbleChipId: null,
      aimPoint: null,
      lockedAim: null,
    })
  },

  nextDuel: () => {
    if (hitstopTimer) clearTimeout(hitstopTimer)
    set((s) => ({
      phase: 'ready',
      currentTurn: 'player',
      chips: makeChips(),
      activeChipId: null,
      resetId: s.resetId + 1,
      lastThrow: null,
      pointerNdc: null,
      aimPoint: null,
      lockedAim: null,
      winner: null,
      winReason: null,
      playerCaptured: 0,
      aiCaptured: 0,
      slam: null,
      hitstop: false,
      timeScale: 1,
      wobbleChipId: null,
    }))
  },

  recordSlam: (x, z, strength) => {
    if (hitstopTimer) clearTimeout(hitstopTimer)
    set({ slam: { id: slamIdCounter++, x, z, strength }, hitstop: true })
    hitstopTimer = setTimeout(() => set({ hitstop: false }), DUEL.hitstopMs)
  },

  setTimeScale: (scale, wobbleChipId = null) => {
    const s = get()
    if (s.timeScale !== scale || s.wobbleChipId !== wobbleChipId)
      set({ timeScale: scale, wobbleChipId })
  },
}))

// Dev-only: expose the store for scripted playtesting/debugging.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__duelStore = useDuelStore
}
