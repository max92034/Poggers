import { create } from 'zustand'

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

interface DuelState {
  phase: DuelPhase
  throwId: number       // increments on each throw; chips use it as a launch signal
  resetId: number       // increments on reset; chips restore their spawn state
  lastThrow: ThrowParams | null

  // Live flip readout for the stats HUD
  defenderFlipped: boolean
  attackerFlipped: boolean // self-flip: the thrown chip ended face-down

  throwChip: (params: ThrowParams) => void
  enterSettled: () => void
  resetDuel: () => void
  setDefenderFlipped: (flipped: boolean) => void
  setAttackerFlipped: (flipped: boolean) => void
}

export const useDuelStore = create<DuelState>((set, get) => ({
  phase: 'ready',
  throwId: 0,
  resetId: 0,
  lastThrow: null,
  defenderFlipped: false,
  attackerFlipped: false,

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

  resetDuel: () =>
    set((s) => ({
      phase: 'ready',
      resetId: s.resetId + 1,
      lastThrow: null,
      defenderFlipped: false,
      attackerFlipped: false,
    })),

  setDefenderFlipped: (flipped) => {
    if (get().defenderFlipped !== flipped) set({ defenderFlipped: flipped })
  },
  setAttackerFlipped: (flipped) => {
    if (get().attackerFlipped !== flipped) set({ attackerFlipped: flipped })
  },
}))
