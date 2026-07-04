import { create } from 'zustand'
import { DUEL } from './duelConstants'

export type DuelPhase =
  | 'ready'    // waiting for the player's flick
  | 'flight'   // chip thrown, physics running
  | 'settled'  // everything at rest — stats shown, awaiting reset

export interface ThrowParams {
  dirX: number          // normalized horizontal throw direction (world XZ)
  dirZ: number
  speed: number         // launch speed, m/s
  straightness: number  // 0..1, how straight the flick gesture was
}

export interface SlamEvent {
  id: number
  x: number
  z: number
  strength: number // 0..1 normalized gust strength (drives the ring visual)
}

interface DuelState {
  phase: DuelPhase
  throwId: number       // increments on each throw; chips use it as a launch signal
  resetId: number       // increments on reset; chips restore their spawn state
  lastThrow: ThrowParams | null

  // Live flip readout for the stats HUD
  defenderFlipped: boolean
  attackerFlipped: boolean // self-flip: the thrown chip ended face-down

  // Juice state
  slam: SlamEvent | null   // last slam impact (drives shockwave ring)
  hitstop: boolean         // physics frozen for a few frames after impact
  timeScale: number        // 1 = normal, <1 = wobble slow-mo

  throwChip: (params: ThrowParams) => void
  enterSettled: () => void
  resetDuel: () => void
  setDefenderFlipped: (flipped: boolean) => void
  setAttackerFlipped: (flipped: boolean) => void
  recordSlam: (x: number, z: number, strength: number) => void
  setTimeScale: (scale: number) => void
}

let slamIdCounter = 1
let hitstopTimer: ReturnType<typeof setTimeout> | null = null

export const useDuelStore = create<DuelState>((set, get) => ({
  phase: 'ready',
  throwId: 0,
  resetId: 0,
  lastThrow: null,
  defenderFlipped: false,
  attackerFlipped: false,
  slam: null,
  hitstop: false,
  timeScale: 1,

  throwChip: (params) => {
    if (get().phase !== 'ready') return
    set((s) => ({
      phase: 'flight',
      throwId: s.throwId + 1,
      lastThrow: params,
    }))
  },

  enterSettled: () => {
    if (get().phase !== 'flight') return
    set({ phase: 'settled' })
  },

  resetDuel: () => {
    if (hitstopTimer) clearTimeout(hitstopTimer)
    set((s) => ({
      phase: 'ready',
      resetId: s.resetId + 1,
      lastThrow: null,
      defenderFlipped: false,
      attackerFlipped: false,
      slam: null,
      hitstop: false,
      timeScale: 1,
    }))
  },

  setDefenderFlipped: (flipped) => {
    if (get().defenderFlipped !== flipped) set({ defenderFlipped: flipped })
  },
  setAttackerFlipped: (flipped) => {
    if (get().attackerFlipped !== flipped) set({ attackerFlipped: flipped })
  },

  recordSlam: (x, z, strength) => {
    // Hitstop: freeze physics for a few frames so the impact reads.
    if (hitstopTimer) clearTimeout(hitstopTimer)
    set({ slam: { id: slamIdCounter++, x, z, strength }, hitstop: true })
    hitstopTimer = setTimeout(() => set({ hitstop: false }), DUEL.hitstopMs)
  },

  setTimeScale: (scale) => {
    if (get().timeScale !== scale) set({ timeScale: scale })
  },
}))
