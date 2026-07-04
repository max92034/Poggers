import { create } from 'zustand'
import { DUEL, VENUES, type VenueId } from './duelConstants'
import { STORY_RIVALS, decorate, type Rival, type DialogueLine } from './story'
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

import { CHIP_TYPES, type ChipParams } from './chipTypes'
export { CHIP_TYPES }
export type { ChipParams }

export interface ChipState {
  id: string
  side: DuelSide
  index: number // 0..stackSize-1; 0 is the ante chip
  status: ChipStatus
  params: ChipParams
  uid: number // owning OwnedChip uid (player side), -1 for rival chips
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

// Starter roster: ante + one plain thrower, then the two chips born from
// real playground mods.
const ROSTER = ['standard', 'standard', 'whiteout', 'warped'] as const

/** A chip you own — persists across duels until captured or lost. */
export interface OwnedChip {
  uid: number
  params: ChipParams
  taken: boolean // won off the rival (bragging rights)
}

let uidCounter = 1

function starterCollection(): OwnedChip[] {
  return ROSTER.map((t) => ({
    uid: uidCounter++,
    params: { ...CHIP_TYPES[t] },
    taken: false,
  }))
}

/** Build the duel lineup: player side from the collection's first chips,
 * rival side a fresh roster (an endless supply of duelists). In the
 * underground den the rival brings modded chips — no weigh-in there. */
function buildChips(
  collection: OwnedChip[],
  venue: VenueId,
  rival: Rival | null
): ChipState[] {
  const chips: ChipState[] = []
  collection.slice(0, DUEL.stackSize).forEach((owned, i) => {
    chips.push({
      id: `player-${i}`,
      side: 'player',
      index: i,
      status: i === 0 ? 'field' : 'stack',
      params: owned.params,
      uid: owned.uid,
    })
  })
  const rivalMods = VENUES[venue].rivalMods
  for (let i = 0; i < DUEL.stackSize; i++) {
    // Story rivals bring their themed roster; free-play rivals draw the
    // starter roster (street-modded in the den).
    const base = rival
      ? { ...rival.roster[i % rival.roster.length] }
      : { ...CHIP_TYPES[ROSTER[i % ROSTER.length]] }
    if (!rival && rivalMods && Math.random() < 0.6) {
      // Street mods: burned or painted, sometimes twice.
      const n = Math.random() < 0.3 ? 2 : 1
      for (let k = 0; k < n; k++) {
        if (Math.random() < 0.5) {
          base.camber = Math.min(1, base.camber + 0.25)
          base.label += ' 🔥'
        } else {
          base.weight = Math.min(2, base.weight + 0.25)
          base.thickness = Math.min(2, base.thickness + 0.25)
          base.label += ' ⬜'
        }
      }
    }
    chips.push({
      id: `ai-${i}`,
      side: 'ai',
      index: i,
      status: i === 0 ? 'field' : 'stack',
      params: base,
      uid: -1,
    })
  }
  return chips
}

/** Hand position on the stance arc: angle 0 = the center of your edge. */
export function handPosFor(side: DuelSide): [number, number, number] {
  const s = useDuelStore.getState()
  const angle = side === 'player' ? s.playerStance : s.aiStance
  const r = DUEL.spawnPos[2]
  const sign = side === 'player' ? 1 : -1
  return [Math.sin(angle) * r * sign, DUEL.spawnPos[1], Math.cos(angle) * r * sign]
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
  playerStance: number // radians along the player's arc, 0 = edge center
  aiStance: number

  winner: DuelSide | null
  winReason: WinReason | null
  playerCaptured: number // chips captured THIS duel
  aiCaptured: number
  playerChipsWon: number // session tally
  aiChipsWon: number

  // Keepsies collection (persists across duels this session)
  collection: OwnedChip[]
  supplies: { lighter: number; paint: number }
  freshPack: boolean // collection was emptied and restocked
  venue: VenueId

  // Story ladder
  storyMode: boolean
  rivalIndex: number
  storyCleared: boolean

  // Dialogue overlay (blocks input while lines remain)
  dialogue: DialogueLine[] | null
  dialogueIndex: number
  introShownFor: number // rival index whose intro already played

  // Juice
  slam: SlamEvent | null
  hitstop: boolean
  timeScale: number
  wobbleChipId: string | null

  setPointerNdc: (x: number, y: number) => void
  setAimPoint: (x: number, z: number) => void
  lockAim: () => void
  setPlayerStance: (angle: number) => void
  throwChip: (flick: { speed: number; straightness: number }) => void
  aiThrow: (params: {
    aimX: number
    aimZ: number
    speed: number
    straightness: number
    stance: number
  }) => void
  resolveOutcome: () => void
  nextDuel: (venue?: VenueId) => void
  modChip: (uid: number, mod: 'burn' | 'paint') => void
  moveChipUp: (uid: number) => void
  startStory: () => void
  startFreePlay: () => void
  advanceRival: () => void
  advanceDialogue: () => void
  skipDialogue: () => void
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

const initialCollection = starterCollection()

export const useDuelStore = create<DuelState>((set, get) => ({
  phase: 'ready',
  currentTurn: 'player',
  chips: buildChips(initialCollection, 'official', null),
  collection: initialCollection,
  supplies: { lighter: 2, paint: 2 },
  freshPack: false,
  venue: 'official',
  storyMode: false,
  rivalIndex: 0,
  storyCleared: false,
  dialogue: null,
  dialogueIndex: 0,
  introShownFor: -1,
  activeChipId: null,
  throwId: 0,
  resetId: 0,
  lastThrow: null,
  pointerNdc: null,
  aimPoint: null,
  lockedAim: null,
  playerStance: 0,
  aiStance: 0,
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

  setPlayerStance: (angle) => {
    const s = get()
    if (s.phase !== 'ready' || s.currentTurn !== 'player') return
    const clamped = Math.max(-DUEL.stanceMaxRad, Math.min(DUEL.stanceMaxRad, angle))
    if (clamped !== s.playerStance) set({ playerStance: clamped })
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

  aiThrow: ({ aimX, aimZ, speed, straightness, stance }) => {
    const s = get()
    if (s.phase !== 'ai_think' || s.currentTurn !== 'ai') return
    const chip = nextStackChip(s.chips, 'ai')
    if (!chip) return
    // Stance must be set BEFORE buildThrow so the hand position is right.
    set({
      aiStance: Math.max(-DUEL.stanceMaxRad, Math.min(DUEL.stanceMaxRad, stance)),
    })
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

      // Keepsies: settle the collection. Player chips captured/lost are
      // gone; rival chips the player flipped join the collection for real.
      const gone = new Set(
        chips
          .filter(
            (c) =>
              c.side === 'player' &&
              (c.status === 'captured' || c.status === 'lost')
          )
          .map((c) => c.uid)
      )
      const spoils: OwnedChip[] = chips
        .filter((c) => c.side === 'ai' && c.status === 'captured')
        .map((c) => ({ uid: uidCounter++, params: { ...c.params }, taken: true }))
      const collection = [
        ...s.collection.filter((o) => !gone.has(o.uid)),
        ...spoils,
      ]
      // Winning the duel restocks the mod supplies a little.
      const supplies =
        winner === 'player'
          ? { lighter: s.supplies.lighter + 1, paint: s.supplies.paint + 1 }
          : s.supplies

      // Story rivals react with a full exchange over the result screen.
      const rival = s.storyMode ? STORY_RIVALS[s.rivalIndex] ?? null : null
      const outro =
        rival && winner !== null
          ? winner === 'player'
            ? decorate(rival.loseDialogue, rival, 'defeat')
            : decorate(rival.winDialogue, rival, 'critical')
          : null

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
        collection,
        supplies,
        dialogue: outro,
        dialogueIndex: 0,
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

  nextDuel: (venue) => {
    if (hitstopTimer) clearTimeout(hitstopTimer)
    set((s) => {
      const rival = s.storyMode ? STORY_RIVALS[s.rivalIndex] ?? null : null
      const v = venue ?? (rival ? rival.venue : s.venue)
      // Play the rival's intro exchange once (not again on rematch).
      const showIntro = rival !== null && s.introShownFor !== s.rivalIndex
      // Cleaned out? A fresh pack from the corner store.
      const restock = s.collection.length === 0
      const collection = restock ? starterCollection() : s.collection
      const chips = buildChips(collection, v, rival)
      const playerHasStack = chips.some(
        (c) => c.side === 'player' && c.status === 'stack'
      )
      return {
        collection,
        freshPack: restock,
        supplies: restock ? { lighter: 2, paint: 2 } : s.supplies,
        chips,
        venue: v,
        dialogue: showIntro ? decorate(rival!.introDialogue, rival!, 'taunt') : null,
        dialogueIndex: 0,
        introShownFor: showIntro ? s.rivalIndex : s.introShownFor,
        currentTurn: playerHasStack ? ('player' as DuelSide) : ('ai' as DuelSide),
        phase: playerHasStack ? ('ready' as DuelPhase) : ('ai_think' as DuelPhase),
        activeChipId: null,
        resetId: s.resetId + 1,
        lastThrow: null,
        pointerNdc: null,
        aimPoint: null,
        lockedAim: null,
        playerStance: 0,
        aiStance: 0,
        winner: null,
        winReason: null,
        playerCaptured: 0,
        aiCaptured: 0,
        slam: null,
        hitstop: false,
        timeScale: 1,
        wobbleChipId: null,
      }
    })
  },

  modChip: (uid, mod) => {
    const s = get()
    if (s.phase !== 'gameover') return
    const supply = mod === 'burn' ? s.supplies.lighter : s.supplies.paint
    if (supply <= 0) return
    let changed = false
    const collection = s.collection.map((o) => {
      if (o.uid !== uid) return o
      const p = { ...o.params }
      if (mod === 'burn') {
        if (p.camber >= 1) return o
        p.camber = Math.min(1, p.camber + 0.25)
        p.label = p.label + ' 🔥'
      } else {
        if (p.weight >= 2) return o
        p.weight = Math.min(2, p.weight + 0.25)
        p.thickness = Math.min(2, p.thickness + 0.25)
        p.label = p.label + ' ⬜'
      }
      changed = true
      return { ...o, params: p }
    })
    if (!changed) return
    set({
      collection,
      supplies: {
        lighter: s.supplies.lighter - (mod === 'burn' ? 1 : 0),
        paint: s.supplies.paint - (mod === 'paint' ? 1 : 0),
      },
    })
  },

  moveChipUp: (uid) => {
    const s = get()
    const i = s.collection.findIndex((o) => o.uid === uid)
    if (i <= 0) return
    const collection = [...s.collection]
    ;[collection[i - 1], collection[i]] = [collection[i], collection[i - 1]]
    set({ collection })
  },

  startStory: () => {
    set({ storyMode: true, rivalIndex: 0, storyCleared: false, introShownFor: -1 })
    get().nextDuel()
  },

  advanceDialogue: () => {
    const s = get()
    if (!s.dialogue) return
    if (s.dialogueIndex + 1 >= s.dialogue.length) {
      set({ dialogue: null, dialogueIndex: 0 })
    } else {
      set({ dialogueIndex: s.dialogueIndex + 1 })
    }
  },

  skipDialogue: () => set({ dialogue: null, dialogueIndex: 0 }),

  startFreePlay: () => {
    set({ storyMode: false, storyCleared: false })
    get().nextDuel('official')
  },

  advanceRival: () => {
    const s = get()
    if (!s.storyMode) return
    const next = s.rivalIndex + 1
    if (next >= STORY_RIVALS.length) {
      set({ storyMode: false, storyCleared: true })
      get().nextDuel('official')
      return
    }
    set({ rivalIndex: next })
    get().nextDuel()
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
