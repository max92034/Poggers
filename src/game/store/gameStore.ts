import { create } from 'zustand'
import type { PopupAction } from '../../art/prompts/popups'
import { MATCH } from '../physics/constants'
import type { SlammerItem } from '../items/types'
import { getItem } from '../items/catalog'

export type Screen = 'menu' | 'select' | 'game' | 'result' | 'duel'
export type Side = 'player' | 'ai'

export type Phase =
  | 'intro'           // match starting
  | 'player_aim'      // player adjusting aim angle
  | 'player_power'    // player in oscillating power meter phase
  | 'launching'       // slammer in flight
  | 'resolving'       // slammer settled, counting flips + transitioning
  | 'ai_thinking'     // AI is "thinking" before its turn (brief delay)
  | 'defeat'          // defeat popup playing before result screen

export interface Popup {
  id: number
  charId: string
  action: PopupAction
  side: Side // whose character is featured
}

interface GameState {
  // Top-level screen
  screen: Screen
  // In-game phase (only meaningful when screen === 'game')
  phase: Phase

  // Roster selection
  playerCharId: string
  aiCharId: string

  // Match state
  currentTurn: Side
  round: number
  playerScore: number
  aiScore: number
  winner: Side | null

  // Per-turn input state
  aimAngle: number       // radians, 0 = straight at stack, + = right (from attacker POV)
  lockedPower: number    // 0-100, locked value from power meter

  // Shot tracking
  shotId: number         // increments each shot; used as React key + per-shot flip reset
  flipsThisShot: number
  // Set during resolving when a main pog is flipped
  mainPogFlipped: Side | null

  // Popups
  popups: Popup[]

  // Rogue-lite items (dev menu for now)
  playerItems: SlammerItem[]
  aiItems: SlammerItem[]

  // Camera zoom distance from target (for preset distance workaround)
  cameraDistance: number

  // ----- Actions -----
  setCameraDistance: (distance: number) => void
  goToSelect: () => void
  goToDuel: () => void
  startMatch: (playerCharId: string, aiCharId: string) => void
  beginPlayerTurn: () => void
  setAim: (angle: number) => void
  enterPowerPhase: () => void
  lockPower: (value: number) => void
  enterResolving: () => void
  recordFlip: (isMain: boolean, mainSide: Side | null) => void
  finishResolving: () => void
  beginAiTurn: () => void
  aiLaunch: (angle: number, power: number) => void
  dismissPopup: (id: number) => void
  queuePopup: (charId: string, action: PopupAction, side: Side) => void
  backToMenu: () => void
  playAgain: () => void
  equipItem: (itemId: string) => void
  unequipItem: (itemId: string) => void
  clearItems: () => void
}

let popupIdCounter = 1

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'menu',
  phase: 'intro',
  playerCharId: 'schoolgirl',
  aiCharId: 'magicalgirl',
  currentTurn: 'player',
  round: 1,
  playerScore: 0,
  aiScore: 0,
  winner: null,
  aimAngle: 0,
  lockedPower: 50,
  shotId: 0,
  flipsThisShot: 0,
  mainPogFlipped: null,
  popups: [],
  playerItems: [],
  aiItems: [],
  cameraDistance: 9,

  goToSelect: () => set({ screen: 'select' }),
  goToDuel: () => set({ screen: 'duel' }),
  setCameraDistance: (distance) => set({ cameraDistance: distance }),

  startMatch: (playerCharId, aiCharId) =>
    set({
      screen: 'game',
      phase: 'intro',
      playerCharId,
      aiCharId,
      currentTurn: 'player',
      round: 1,
      playerScore: 0,
      aiScore: 0,
      winner: null,
      aimAngle: 0,
      lockedPower: 50,
      shotId: 0,
      flipsThisShot: 0,
      mainPogFlipped: null,
      popups: [],
      cameraDistance: 9,
    }),

  beginPlayerTurn: () => {
    const { playerCharId } = get()
    const popup: Popup = {
      id: popupIdCounter++,
      charId: playerCharId,
      action: 'taunt',
      side: 'player',
    }
    set({
      phase: 'player_aim',
      aimAngle: 0,
      lockedPower: 50,
      flipsThisShot: 0,
      mainPogFlipped: null,
      popups: [...get().popups, popup],
    })
  },

  setAim: (angle) => set({ aimAngle: angle }),

  enterPowerPhase: () => set({ phase: 'player_power' }),

  lockPower: (value) =>
    set((s) => ({
      phase: 'launching',
      lockedPower: value,
      shotId: s.shotId + 1,
      flipsThisShot: 0,
      mainPogFlipped: null,
    })),

  enterResolving: () => set({ phase: 'resolving' }),

  recordFlip: (isMain, mainSide) => {
    const s = get()
    const newFlips = s.flipsThisShot + 1
    if (isMain && mainSide) {
      set({ flipsThisShot: newFlips, mainPogFlipped: mainSide })
    } else {
      // Stack pog flipped — attacker scores
      const attacker = s.currentTurn
      set({
        flipsThisShot: newFlips,
        playerScore: attacker === 'player' ? s.playerScore + 1 : s.playerScore,
        aiScore: attacker === 'ai' ? s.aiScore + 1 : s.aiScore,
      })
    }
  },

  finishResolving: () => {
    const s = get()
    // Build per-shot popups first.
    // - Critical: shown for the attacker when they slammed >= threshold pogs.
    // - Defeat: shown for the defender when they got slammed >= threshold pogs.
    // Both can fire on the same shot and appear simultaneously (top + bottom).
    const perShotPopups: Popup[] = []
    if (s.flipsThisShot >= MATCH.criticalThreshold) {
      const attacker: Side = s.currentTurn
      const defender: Side = attacker === 'player' ? 'ai' : 'player'
      perShotPopups.push({
        id: popupIdCounter++,
        charId: attacker === 'player' ? s.playerCharId : s.aiCharId,
        action: 'critical',
        side: attacker,
      })
      perShotPopups.push({
        id: popupIdCounter++,
        charId: defender === 'player' ? s.playerCharId : s.aiCharId,
        action: 'defeat',
        side: defender,
      })
    }

    // Main pog flipped → match ends.
    if (s.mainPogFlipped) {
      const loser = s.mainPogFlipped
      const winner: Side = loser === 'player' ? 'ai' : 'player'
      // If the killing shot didn't already produce a per-shot defeat popup
      // for the loser, queue one so the loser is still acknowledged.
      const hasDefeat = perShotPopups.some(
        (p) => p.action === 'defeat' && p.side === loser
      )
      const closingPopups = hasDefeat
        ? perShotPopups
        : [
            ...perShotPopups,
            {
              id: popupIdCounter++,
              charId: loser === 'player' ? s.playerCharId : s.aiCharId,
              action: 'defeat' as PopupAction,
              side: loser,
            },
          ]
      set({
        phase: 'defeat',
        winner,
        popups: [...s.popups, ...closingPopups],
      })
      return
    }

    // Round limit reached?
    if (s.round >= MATCH.maxRounds) {
      const winner: Side =
        s.playerScore > s.aiScore
          ? 'player'
          : s.aiScore > s.playerScore
          ? 'ai'
          : 'player'
      set({ phase: 'defeat', winner, popups: [...s.popups, ...perShotPopups] })
      return
    }

    // Otherwise advance turn
    const nextTurn: Side = s.currentTurn === 'player' ? 'ai' : 'player'
    const nextRound = nextTurn === 'player' ? s.round + 1 : s.round
    set({
      currentTurn: nextTurn,
      round: nextRound,
      phase: nextTurn === 'player' ? 'player_aim' : 'ai_thinking',
      aimAngle: 0,
      lockedPower: 50,
      popups: [...s.popups, ...perShotPopups],
    })
    // Push taunt popup for the new attacker
    if (nextTurn === 'player') {
      const taunt: Popup = {
        id: popupIdCounter++,
        charId: get().playerCharId,
        action: 'taunt',
        side: 'player',
      }
      set({ popups: [...get().popups, taunt] })
    }
  },

  beginAiTurn: () => set({ phase: 'ai_thinking' }),

  aiLaunch: (angle, power) =>
    set((s) => ({
      phase: 'launching',
      aimAngle: angle,
      lockedPower: power,
      shotId: s.shotId + 1,
      flipsThisShot: 0,
      mainPogFlipped: null,
    })),

  dismissPopup: (id) => set((s) => ({ popups: s.popups.filter((p) => p.id !== id) })),

  queuePopup: (charId, action, side) =>
    set((s) => ({
      popups: [...s.popups, { id: popupIdCounter++, charId, action, side }],
    })),

  backToMenu: () =>
    set({
      screen: 'menu',
      phase: 'intro',
      popups: [],
      winner: null,
    }),

  playAgain: () =>
    set({
      screen: 'game',
      phase: 'intro',
      currentTurn: 'player',
      round: 1,
      playerScore: 0,
      aiScore: 0,
      winner: null,
      aimAngle: 0,
      lockedPower: 50,
      shotId: 0,
      flipsThisShot: 0,
      mainPogFlipped: null,
      popups: [],
    }),

  equipItem: (itemId) => {
    const item = getItem(itemId)
    if (!item) return
    const current = get().playerItems
    if (current.some((i) => i.id === itemId)) return
    set({ playerItems: [...current, item] })
  },

  unequipItem: (itemId) =>
    set((s) => ({
      playerItems: s.playerItems.filter((i) => i.id !== itemId),
    })),

  clearItems: () => set({ playerItems: [], aiItems: [] }),
}))
