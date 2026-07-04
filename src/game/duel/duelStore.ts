import { create } from 'zustand'
import { DUEL } from './duelConstants'
import { getChip } from './chipRegistry'

export type DuelSide = 'player' | 'ai'
export type DuelPhase =
  | 'ready'     // attacker may throw (player: flick armed; see currentTurn)
  | 'ai_think'  // rival is lining up its throw
  | 'flight'    // chip thrown, physics running
  | 'gameover'  // duel decided — banner + next-duel prompt

export type WinReason = 'flip' | 'self-flip' | 'ring-out' | 'out-of-bounds' | 'draw'

export interface ThrowParams {
  attacker: DuelSide
  dirX: number          // normalized horizontal throw direction (world XZ)
  dirZ: number
  speed: number         // launch speed, m/s
  straightness: number  // 0..1, how straight the flick gesture was
}

export interface SlamEvent {
  id: number
  x: number
  z: number
  strength: number // 0..1 normalized gust strength (ring visual + sound)
}

interface DuelState {
  phase: DuelPhase
  currentTurn: DuelSide
  throwId: number       // increments on each throw; chips use it as a launch signal
  resetId: number       // increments on new duel; chips restore spawn state
  throwCount: number    // throws so far this duel (draw at maxThrows)
  lastThrow: ThrowParams | null

  winner: DuelSide | null
  winReason: WinReason | null
  playerChipsWon: number // session keepsies tally
  aiChipsWon: number

  // Live face-down readout per side (final state at resolve decides)
  playerFlipped: boolean
  aiFlipped: boolean

  // Juice state
  slam: SlamEvent | null
  hitstop: boolean
  timeScale: number

  throwChip: (params: Omit<ThrowParams, 'attacker'>) => void
  aiThrow: (params: Omit<ThrowParams, 'attacker'>) => void
  resolveOutcome: () => void
  nextDuel: () => void
  setFlipped: (side: DuelSide, flipped: boolean) => void
  recordSlam: (x: number, z: number, strength: number) => void
  setTimeScale: (scale: number) => void
}

let slamIdCounter = 1
let hitstopTimer: ReturnType<typeof setTimeout> | null = null

function distFromCenter(side: DuelSide): number {
  const body = getChip(side)
  if (!body) return 0
  const p = body.translation()
  return Math.hypot(p.x, p.z)
}

export const useDuelStore = create<DuelState>((set, get) => ({
  phase: 'ready',
  currentTurn: 'player',
  throwId: 0,
  resetId: 0,
  throwCount: 0,
  lastThrow: null,
  winner: null,
  winReason: null,
  playerChipsWon: 0,
  aiChipsWon: 0,
  playerFlipped: false,
  aiFlipped: false,
  slam: null,
  hitstop: false,
  timeScale: 1,

  throwChip: (params) => {
    const s = get()
    if (s.phase !== 'ready' || s.currentTurn !== 'player') return
    set({
      phase: 'flight',
      throwId: s.throwId + 1,
      throwCount: s.throwCount + 1,
      lastThrow: { ...params, attacker: 'player' },
    })
  },

  aiThrow: (params) => {
    const s = get()
    if (s.phase !== 'ai_think' || s.currentTurn !== 'ai') return
    set({
      phase: 'flight',
      throwId: s.throwId + 1,
      throwCount: s.throwCount + 1,
      lastThrow: { ...params, attacker: 'ai' },
    })
  },

  // Called by the attacker chip when everything has settled. Decides the
  // duel or passes the turn. Priority order matters:
  //   1. defender face-down inside the circle → attacker wins + TAKES the chip
  //   2. attacker's own chip face-down (self-flip) → defender wins + takes it
  //   3. attacker's chip outside the circle → defender wins + takes it
  //      (overshooting a max-power slam is a real risk, like street rules)
  //   4. defender chip pushed outside → attacker wins the duel, NO capture
  //   5. throw budget exhausted → draw
  //   6. otherwise pass the turn
  resolveOutcome: () => {
    const s = get()
    if (s.phase !== 'flight') return
    const attacker = s.currentTurn
    const defender: DuelSide = attacker === 'player' ? 'ai' : 'player'
    const attFlipped = attacker === 'player' ? s.playerFlipped : s.aiFlipped
    const defFlipped = defender === 'player' ? s.playerFlipped : s.aiFlipped
    const attOut = distFromCenter(attacker) > DUEL.circleRadius
    const defOut = distFromCenter(defender) > DUEL.circleRadius

    const endDuel = (winner: DuelSide, reason: WinReason, capture: boolean) =>
      set({
        phase: 'gameover',
        winner,
        winReason: reason,
        timeScale: 1,
        playerChipsWon: s.playerChipsWon + (capture && winner === 'player' ? 1 : 0),
        aiChipsWon: s.aiChipsWon + (capture && winner === 'ai' ? 1 : 0),
      })

    if (defFlipped && !defOut) return endDuel(attacker, 'flip', true)
    if (attFlipped) return endDuel(defender, 'self-flip', true)
    if (attOut) return endDuel(defender, 'out-of-bounds', true)
    if (defOut) return endDuel(attacker, 'ring-out', false)
    if (s.throwCount >= DUEL.maxThrows)
      return set({ phase: 'gameover', winner: null, winReason: 'draw', timeScale: 1 })

    set({
      currentTurn: defender,
      phase: defender === 'ai' ? 'ai_think' : 'ready',
      timeScale: 1,
    })
  },

  nextDuel: () => {
    if (hitstopTimer) clearTimeout(hitstopTimer)
    set((s) => ({
      phase: 'ready',
      currentTurn: 'player',
      resetId: s.resetId + 1,
      throwCount: 0,
      lastThrow: null,
      winner: null,
      winReason: null,
      playerFlipped: false,
      aiFlipped: false,
      slam: null,
      hitstop: false,
      timeScale: 1,
    }))
  },

  setFlipped: (side, flipped) => {
    const key = side === 'player' ? 'playerFlipped' : 'aiFlipped'
    if (get()[key] !== flipped) set({ [key]: flipped } as Partial<DuelState>)
  },

  recordSlam: (x, z, strength) => {
    if (hitstopTimer) clearTimeout(hitstopTimer)
    set({ slam: { id: slamIdCounter++, x, z, strength }, hitstop: true })
    hitstopTimer = setTimeout(() => set({ hitstop: false }), DUEL.hitstopMs)
  },

  setTimeScale: (scale) => {
    if (get().timeScale !== scale) set({ timeScale: scale })
  },
}))

// Dev-only: expose the store for scripted playtesting/debugging.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__duelStore = useDuelStore
}
