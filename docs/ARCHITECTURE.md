# Poggers — System Architecture

> **Version:** 2.30  
> **Last Updated:** 2026-07-03  
> **Audience:** Collaborators, contributors, and maintainers

---

## 1. Overview

Poggers is a **3D browser-based pog-battling game** built with React, TypeScript, and Rapier WASM physics. Two players (human vs AI) take turns launching a "slammer" disc at a central stack of pogs. Pogs that flip face-down are collected by the attacker. The match ends when a "main pog" is flipped (instant win) or after 5 rounds (highest score wins).

The visual identity is **"Neo-Arcade Combat Arena"** — a fighting-game-inspired aesthetic with angular clip-paths, CRT scanlines, film grain, and a hot magenta / electric cyan / amber color palette.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | ^18.3.1 |
| Language | TypeScript | ^5.6.3 |
| Build Tool | Vite | ^5.4.10 |
| 3D Rendering | Three.js | ^0.169.0 |
| React 3D Binding | @react-three/fiber | ^8.17.10 |
| 3D Helpers | @react-three/drei | ^9.114.0 |
| Physics Engine | @react-three/rapier (Rapier WASM) | ^1.5.0 |
| State Management | Zustand | ^4.5.5 |
| Icons | lucide-react | ^0.454.0 |
| Deployment | GitHub Pages (GitHub Actions) | — |

### Why These Choices

- **Rapier WASM** — Real-time 3D physics in the browser without server-side computation. Handles rigid body dynamics, collision detection, and constraints at 60fps.
- **@react-three/fiber** — Declarative Three.js in React. Lets us compose 3D scenes as JSX components.
- **Zustand** — Lightweight global state without React Context boilerplate. Critical for sharing game state across 3D scene components and 2D UI overlays.
- **Vite** — Fast HMR dev server and optimized production builds. Handles WASM assets (Rapier) out of the box.

---

## 3. Project Structure

```
Poggers/
├── .github/workflows/
│   └── deploy.yml                  # CI/CD: build → deploy to GitHub Pages
├── docs/                           # ← You are here
│   ├── ARCHITECTURE.md
│   ├── GAME_DESIGN.md
│   ├── UI_DESIGN_SYSTEM.md
│   └── CONTRIBUTING.md
├── public/
│   └── art/                        # Generated character art (PNG)
│       ├── {charId}-pog.png        # Pog top-face texture (square)
│       ├── {charId}-popup-critical.png
│       ├── {charId}-popup-defeat.png
│       └── {charId}-popup-taunt.png
├── scripts/
│   └── generate-placeholders.cjs   # Art generation script (Node + canvas)
├── src/
│   ├── art/
│   │   ├── assets.ts               # URL helpers for art assets
│   │   └── prompts/
│   │       ├── pogTextures.ts      # SDXL prompts for pog face art
│   │       └── popups.ts           # SDXL prompts for popup action art
│   ├── game/
│   │   ├── ai/
│   │   │   └── aiBrain.ts          # AI shot decision logic
│   │   ├── characters/
│   │   │   ├── types.ts            # Character & Stats interfaces
│   │   │   └── roster.ts           # 3 starter characters
│   │   ├── items/
│   │   │   ├── types.ts            # SlammerItem interface
│   │   │   ├── catalog.ts          # 4 rogue-lite items
│   │   │   └── itemPhysics.ts      # Item → physics modifier computations
│   │   ├── physics/
│   │   │   ├── constants.ts        # All tunable physics/arena/match values
│   │   │   ├── PogDisc.tsx         # Single pog (RigidBody + flip detection)
│   │   │   ├── PogStack.tsx        # 8-pog neutral stack + 2 main pogs
│   │   │   ├── Slammer.tsx         # Slammer disc (launch, items, collision)
│   │   │   └── Colosseum.tsx       # Ring-out boundary (visual + physics)
│   │   ├── scenes/
│   │   │   └── ArenaScene.tsx      # Main Canvas: lights, camera, physics world
│   │   ├── store/
│   │   │   └── gameStore.ts        # Zustand store (game state machine)
│   │   └── ui/
│   │       ├── AimPower.tsx        # Aim slider + oscillating power meter
│   │       ├── DevMenu.tsx         # Dev item equip/unequip panel
│   │       ├── PopupLayer.tsx      # Critical/Defeat/Taunt popup overlays
│   │       ├── Scoreboard.tsx      # Player/AI score panels
│   │       └── TurnIndicator.tsx   # Top bar: characters, round, phase
│   ├── screens/
│   │   ├── MainMenu.tsx            # Title screen
│   │   ├── CharacterSelect.tsx     # Character roster selection
│   │   └── ResultScreen.tsx        # Victory/Defeat screen
│   ├── App.tsx                     # Root: screen router + dev menu wrapper
│   ├── main.tsx                    # React entry point
│   ├── index.css                   # Global styles, design tokens, animations
│   └── vite-env.d.ts
├── index.html                      # HTML shell + Google Fonts
├── vite.config.ts                  # Vite config (base path for GH Pages)
├── tsconfig.json
└── package.json
```

---

## 4. Application Flow

### 4.1 Screen State Machine

The app has four top-level screens, controlled by `screen` in the Zustand store:

```
menu  →  select  →  game  →  result
 ↑                         ↓
 └─────────────────────────┘  (backToMenu / playAgain)
```

| Screen | Component | Trigger |
|--------|-----------|---------|
| `menu` | `MainMenu` | App load, `backToMenu()` |
| `select` | `CharacterSelect` | `goToSelect()` |
| `game` | `GameScreen` (ArenaScene + UI overlays) | `startMatch(charId, aiCharId)` |
| `result` | `ResultScreen` | `phase === 'defeat' && popups.length === 0` |

### 4.2 In-Game Phase State Machine

Within the `game` screen, a `phase` field drives the game loop:

```
intro
  │ (800ms delay)
  ▼
player_aim ────► player_power ────► launching ────► resolving
  ▲                                        │              │
  │                                        │              │ (900ms delay)
  │                                        │              ▼
  │                                        │         finishResolving
  │                                        │              │
  │                                        │    ┌─────────┴──────────┐
  │                                        │    │                    │
  │                                        │    ▼                    ▼
  │                                        │  Next round:       mainPogFlipped
  │                                        │  ai_thinking        or round > max
  │                                        │    │                    │
  │                                        │    │ (1500ms)           │
  │                                        │    ▼                    ▼
  └────────────────────────────────────────┘  ai launch          defeat
                                                                (→ result screen)
```

### 4.3 Phase → Component Visibility

| Phase | ArenaScene | TurnIndicator | Scoreboard | AimPower | PopupLayer |
|-------|-----------|---------------|------------|----------|------------|
| `intro` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `player_aim` | ✓ | ✓ | ✓ | ✓ (aim slider) | ✓ (taunt) |
| `player_power` | ✓ | ✓ | ✓ | ✓ (power bar) | ✓ |
| `launching` | ✓ (chase cam) | ✓ | ✓ | ✗ | ✓ |
| `resolving` | ✓ (overview cam) | ✓ | ✓ | ✗ | ✓ |
| `ai_thinking` | ✓ | ✓ | ✓ | ✗ | ✓ |
| `defeat` | ✓ | ✓ | ✓ | ✗ | ✓ (defeat popup) |

---

## 5. State Management (Zustand Store)

**File:** `src/game/store/gameStore.ts`

All game state lives in a single Zustand store. This is critical because both 3D scene components (inside the R3F Canvas) and 2D UI overlays (outside the Canvas) need to read and update the same state.

### State Shape

```typescript
interface GameState {
  // Screen routing
  screen: 'menu' | 'select' | 'game' | 'result'
  phase: Phase  // in-game phase state machine

  // Character selection
  playerCharId: string
  aiCharId: string

  // Match state
  currentTurn: 'player' | 'ai'
  round: number           // 1-5
  playerScore: number     // stack pogs flipped by player
  aiScore: number         // stack pogs flipped by AI
  winner: 'player' | 'ai' | null

  // Per-turn input
  aimAngle: number        // radians, 0 = straight, += right
  lockedPower: number     // 0-100 from power meter

  // Shot tracking
  shotId: number          // increments each shot; React key + flip reset signal
  flipsThisShot: number
  mainPogFlipped: 'player' | 'ai' | null

  // Popups
  popups: Popup[]

  // Rogue-lite items
  playerItems: SlammerItem[]
  aiItems: SlammerItem[]
}
```

### Key Actions

| Action | Side Effect |
|--------|-------------|
| `startMatch(player, ai)` | Resets all match state, sets screen='game', phase='intro' |
| `beginPlayerTurn()` | Sets phase='player_aim', queues taunt popup |
| `setAim(angle)` | Updates aimAngle |
| `enterPowerPhase()` | Sets phase='player_power' |
| `lockPower(value)` | Sets phase='launching', increments shotId, resets flips |
| `enterResolving()` | Sets phase='resolving' (called by Slammer when at rest) |
| `recordFlip(isMain, side)` | Increments flipsThisShot, updates score, sets mainPogFlipped |
| `finishResolving()` | Evaluates match end conditions, queues popups, advances turn |
| `aiLaunch(angle, power)` | Sets phase='launching' with AI's chosen parameters |
| `dismissPopup(id)` | Removes a popup from the queue |

---

## 6. Physics System

### 6.1 Rapier Integration

The physics world is managed by `@react-three/rapier`'s `<Physics>` component in `ArenaScene.tsx`:

```tsx
<Physics gravity={[0, -9.81, 0]} timeStep="vary">
```

- **Gravity:** -9.81 m/s² (realistic Earth gravity)
- **timeStep:** "vary" — Rapier substeps based on frame delta to maintain stability
- **All physics bodies use CCD (Continuous Collision Detection)** to prevent fast-moving objects (the slammer) from tunneling through thin pogs.

### 6.2 Physics Bodies

| Entity | Body Type | Collider | Mass | Notes |
|--------|-----------|----------|------|-------|
| Arena Floor | Fixed | Cuboid (12×0.1×12 m) | — | Friction 0.6, restitution 0.3 |
| Arena Walls (×4) | Fixed | Cuboid | — | Prevent pogs from flying off |
| Colosseum Wall (×20 segments) | Fixed | Cuboid | — | Ring-out boundary, restitution 0.5 |
| Stack Pogs (×8) | Dynamic | Cylinder | 0.008 kg | Restitution 0.4, friction 0.5 |
| Main Pogs (×2) | Dynamic | Cylinder | 0.020 kg | 2.5× stack pog mass |
| Slammer | Dynamic/Fixed | Cylinder or Ball array | 0.15–0.5 kg | Switches to 'fixed' when parked |

### 6.3 Slammer Lifecycle

The slammer is **always mounted** (never unmounted/remounted) to avoid Rapier crashes. It switches between `dynamic` (active) and `fixed` (parked at y=50) body types.

1. **Spawn:** Positioned at `(0, 4.0, ±0.1)` — above the stack, on the attacker's side
2. **Launch:** First frame of `launching` phase, applies impulse toward aim target + torque impulse for spin
3. **Flight:** Physics simulation handles collisions, bounces, gravity
4. **Settle:** When velocity < 0.3 m/s for 1.0s, or after 6.0s hard timeout → `enterResolving()`
5. **Park:** Body teleported to `(0, 50, 0)` and set to `fixed`

### 6.4 Flip Detection

Each `PogDisc` tracks its orientation every frame via `useFrame`:

1. Read body's rotation quaternion
2. Apply quaternion to local up vector `(0, 1, 0)`
3. If world-y < 0 → pog is face-down (flipped)
4. Only count flips during `launching` or `resolving` phases
5. **Ring-out check:** If flipped pog's center distance from arena center > `colosseumRadius` (4.5m), the flip doesn't count
6. Fire `recordFlip()` exactly once per shot (tracked via `reportedRef`)

### 6.5 Stat → Physics Mapping

Character stats (1-10 scale) are converted to physical values in `constants.ts`:

| Stat | Formula | Range |
|------|---------|-------|
| weight → mass | `0.15 + (weight/10) × 0.35` | 0.15–0.50 kg |
| bounce → restitution | `0.05 + (bounce/10) × 0.3` | 0.05–0.35 |
| power → launch speed | `6 + (power/10) × 12` × power% | 2.4–18 m/s |
| spin → torque impulse | `(0.02 + (spin/10) × 0.18) × power%` | 0–0.20 |
| control → meter speed | `6.0 - (control/10) × 4.8` | 1.2–6.0 rad/s |

---

## 7. Camera System

The camera has two modes, managed by the `CameraRig` component inside the Canvas:

| Phase | Camera Behavior |
|-------|----------------|
| `launching` | Chase cam: follows slammer from behind attacker, lerped at 8%/frame |
| `resolving` | Overview: eases back to `(0, 6, 9)` looking at `(0, 0.5, 0)` |
| All other phases | OrbitControls enabled (user can rotate/zoom) |

**OrbitControls** is configured with `makeDefault` to take ownership of camera management and prevent the bounce-back issue where R3F's internal camera reset conflicts with user zoom. Zoom is limited to 0.3 (min) – 20 (max) distance.

---

## 8. AI System

**File:** `src/game/ai/aiBrain.ts`

The AI uses a stat-based decision algorithm:

1. **Aim:** Targets stack centroid (angle 0) with Gaussian noise scaled inversely by control stat
   - Control 10 → ±0.05 rad noise (very precise)
   - Control 1 → ±0.6 rad noise (very wild)
2. **Power:** Base power from power stat (30-75%), plus round-based escalation bias (+3%/round), plus ±10% random variance
3. **Thinking delay:** 1500ms (simulates "thinking" before launching)

---

## 9. Item System (Rogue-Lite)

Items modify the slammer's physics and visual appearance. Currently accessible via the Dev Menu (no in-game acquisition flow yet).

| Item | Physics Effect | Visual Effect |
|------|---------------|---------------|
| Pocket Lighter | ×0.85 mass, ×1.2 spin, +0.1 restitution | Bent cylinder (banana/U-shape) |
| Chewing Gum | +0.08 kg mass, ×1.3 spin, ×1.5 friction | Pink sphere on slammer bottom; pogs stick via velocity blending |
| Baby Oil | Opponent's pogs become slippery (×0.3 friction, +0.25 restitution) | No visual on slammer (affects opponent pogs) |
| Magnets | ×1.5 spin | Glowing cyan torus ring around slammer |

### Item Physics Pipeline

```
Base value (from character stat)
    │
    ▼
itemPhysics.computeSlammer*(baseValue, items)
    │
    ▼
Final value passed to RigidBody
```

Each `compute*` function iterates over all equipped items and applies multiplicative/additive modifiers.

### U-Shape Collider (Pocket Lighter)

The U-shape slammer uses **7 BallColliders** along a curved centerline instead of a single CylinderCollider. The density is calculated as `mass / totalBallVolume` to ensure the total collider mass matches the intended mass. This prevents the excessive velocity bug that occurs when density is mismatched.

---

## 10. Build & Deployment

### Build

```bash
npm run build    # tsc -b && vite build → ./dist/
```

### Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`):

1. Triggered on push to `main` branch
2. Node.js 20 + `npm ci`
3. `npm run build`
4. Upload `./dist/` as Pages artifact
5. Deploy to GitHub Pages

**Live URL:** https://max92034.github.io/Poggers/

### Vite Config Notes

- `base: '/Poggers/'` — required for GitHub Pages subpath deployment
- `optimizeDeps.exclude: ['@react-three/rapier']` — Rapier ships WASM that must not be pre-bundled by Vite's dependency optimizer

---

## 11. Key Technical Decisions & Lessons

| Decision | Rationale |
|----------|-----------|
| Slammer always mounted | Unmount/remount of RigidBody causes Rapier WASM crashes. Type-switching avoids this. |
| Flip detection via up-vector | More reliable than contact-counting. Works even if pog bounces and lands face-down later. |
| shotId as React key + reset signal | Prevents stale flip state from leaking between shots. Each PogDisc resets its `reportedRef` when shotId changes. |
| Dev menu outside game-screen div | R3F Canvas covers siblings with z-index. Dev menu must be a sibling of game-screen, not a child. |
| Aim line outside Physics provider | Prevents physics collisions with the visual aim indicator. |
| U-shape density calculation | `density = mass / totalColliderVolume` prevents runaway velocity from mass/density mismatch. |
| Rotation air resistance (12%/frame) | Applied after first pog contact. Prevents slammer from spinning indefinitely. |
| OrbitControls.makeDefault | Takes ownership of camera from R3F internals. Fixes bounce-back zoom issue. |
| CRT scanlines via body::after | Global overlay at z-index 9997. Pointer-events disabled so it doesn't block interaction. |
