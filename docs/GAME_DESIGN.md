# Poggers — Game Design Document

> **Version:** 2.30  
> **Last Updated:** 2026-07-03  
> **Audience:** Game designers, content creators, and developers

---

## 1. Game Summary

Poggers is a **turn-based 3D pog-battling game** inspired by the classic schoolyard game of POGs, reimagined as a fighting-game-style combat arena. Players select an anime-style character, take turns launching a "slammer" at a stack of pogs, and compete to flip the most pogs (or flip the opponent's main pog for an instant win).

**Core Loop:**
```
Select Character → Aim → Time Power → Launch → Watch Physics → Score → Next Turn
```

**Match Duration:** ~3-5 minutes (5 rounds, alternating turns)

---

## 2. Win Conditions

| Condition | Result |
|-----------|--------|
| Flip the opponent's **main pog** | Instant win (regardless of score) |
| After 5 rounds, most stack pogs flipped | Win by score |
| Tie after 5 rounds | Player wins (tiebreaker favor) |

---

## 3. Match Structure

### 3.1 Round Flow

A "round" = one full turn cycle (player + AI each get one shot).

```
Round 1: Player shoots → AI shoots
Round 2: Player shoots → AI shoots
...
Round 5: Player shoots → AI shoots → Match ends
```

- **Max rounds:** 5
- **Turn order:** Player always goes first each round
- **Turn alternation:** After player's shot → AI's shot → next round

### 3.2 Turn Phases

Each turn follows this sequence:

1. **Aim Phase** (`player_aim`): Player adjusts aim angle with a slider
2. **Power Phase** (`player_power`): An oscillating power meter moves; player clicks to lock
3. **Launch Phase** (`launching`): Slammer flies, physics simulation runs
4. **Resolve Phase** (`resolving`): Slammer settles, flips are counted, score updates
5. **Transition:** Either next turn begins or match ends

For AI turns, phases 1-2 are replaced by a 1500ms "thinking" delay, after which the AI's aim and power are automatically set.

---

## 4. Arena Layout

```
         ┌─────────────────────────┐
         │                         │
         │       AI Main Pog       │  z = -4.2m
         │                         │
         │    ┌───────────┐        │
         │    │  Colosseum│        │  radius = 4.5m
         │    │   Ring    │        │
         │    │           │        │
         │    │  ███████  │        │  8-pog stack at center
         │    │  Stack    │        │  (0, 0, 0)
         │    │           │        │
         │    │           │        │
         │    └───────────┘        │
         │                         │
         │     Player Main Pog     │  z = +4.2m
         │                         │
         └─────────────────────────┘

         Floor: 12m × 12m square
         Walls: 2m tall invisible barriers
```

### Arena Constants (`constants.ts`)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `floorSize` | 12 m | Square floor side length |
| `stackCount` | 8 | Neutral pogs in center stack |
| `stackRadius` | 0.5 m | Pog disc radius |
| `stackHeight` | 0.05 m | Pog disc thickness |
| `mainPogOffset` | 4.2 m | Distance from center to main pogs |
| `slammerSpawnHeight` | 4.0 m | Slammer spawn Y position |
| `slammerAimRadius` | 0.25 m | Max aim offset from center |
| `slammerRadius` | 0.3 m | Slammer disc radius |
| `colosseumRadius` | 4.5 m | Ring-out boundary radius |
| `colosseumWallHeight` | 1.0 m | Colosseum wall height |

---

## 5. Character System

### 5.1 Stat System

Each character has 5 stats on a 1-10 scale:

| Stat | Effect | Physics Mapping |
|------|--------|-----------------|
| **Power** | Slammer launch velocity | 6-18 m/s base speed |
| **Spin** | Torque impulse on slammer | Affects scatter radius |
| **Weight** | Slammer mass | 0.15-0.50 kg (heavier = more flip force) |
| **Bounce** | Slammer restitution | 0.05-0.35 (bouncier = multi-hit scatter) |
| **Control** | Power meter speed (slower = easier) | 1.2-6.0 rad/s oscillation |

### 5.2 Stat Triangle

The three starter characters form a rock-paper-scissors-style stat triangle:

```
        Control (precision)
           School Girl
           /          \
          /            \
     Magic Girl  ←→  Older Sister
     (chaotic power)  (steady powerhouse)
```

### 5.3 Character Roster

#### Aoi — School Girl (Light Element)

| Stat | Value | Playstyle |
|------|-------|-----------|
| Power | 5 | Balanced |
| Spin | 5 | Balanced |
| Weight | 5 | Balanced |
| Bounce | 5 | Balanced |
| Control | 9 | Very precise |

**Tagline:** "Calm, precise, beginner-friendly. Steady aim wins the day."  
**Palette:** Navy blue (#1a2a4f), White (#f5f7fa), Red (#d63031)

**Design Notes:** Aoi is the "Ryu" of Poggers — balanced stats with exceptional control. Her slow power meter makes timing easy, rewarding consistent play. Good for learning the game.

---

#### Lumina — Magic Girl (Arcane Element)

| Stat | Value | Playstyle |
|------|-------|-----------|
| Power | 9 | Explosive |
| Spin | 8 | High scatter |
| Weight | 3 | Light/fast |
| Bounce | 6 | Moderate bounce |
| Control | 3 | Very wild |

**Tagline:** "Explosive magic power, wild scatter. High risk, high reward."  
**Palette:** Pink (#ff8fb1), Lavender (#b18cff), Gold (#ffd166)

**Design Notes:** Lumina is the high-risk/high-reward character. Her power and spin create spectacular scatter, but her fast power meter and light weight make consistent timing difficult. Best for aggressive players who want big flips.

---

#### Kuroe — Older Sister (Dark Element)

| Stat | Value | Playstyle |
|------|-------|-----------|
| Power | 6 | Moderate |
| Spin | 4 | Low scatter |
| Weight | 9 | Very heavy |
| Bounce | 8 | High bounce |
| Control | 6 | Moderate |

**Tagline:** "Heavy, steady, relentless. Pure physical pressure."  
**Palette:** Crimson (#8b1e3f), Black (#1a1a1a), Gold (#c9a14a)

**Design Notes:** Kuroe is the tank. Her extreme weight and bounce create multi-hit chaos, bouncing off pogs repeatedly. Low spin means less scatter but more focused impact. Moderate control keeps her accessible.

### 5.4 Adding New Characters

To add a new character:

1. Add entry to `ROSTER` array in `src/game/characters/roster.ts`
2. Create pog texture prompt in `src/art/prompts/pogTextures.ts`
3. Create popup art prompts in `src/art/prompts/popups.ts`
4. Generate art assets and place in `public/art/{charId}-*.png`
5. Test balance against existing roster

**Character ID Convention:** Use lowercase, no spaces (e.g., `magicalgirl`, `oldersister`)

**Stat Balance Guidelines:**
- Total stat points should be ~25-28 (current range: 24-29)
- No stat should be 10 (max practical) and another 1 (min practical) on the same character
- Each character should have a clear identity/strength

---

## 6. Pog Types

### 6.1 Stack Pogs (Neutral)

- **Count:** 8 per match
- **Mass:** 0.008 kg (very light)
- **Restitution:** 0.4 (bouncy)
- **Friction:** 0.5
- **Position:** Stacked at center of arena, slight random offset per pog
- **Scoring:** Each flipped stack pog = 1 point for the attacker
- **Texture:** Neutral palette (gray/slate)

### 6.2 Main Pogs (Player & AI)

- **Count:** 2 (one per side)
- **Mass:** 0.020 kg (2.5× stack pogs)
- **Size:** 15% larger radius, 40% thicker
- **Position:** `z = ±4.2m` from center
- **Scoring:** Flipping the opponent's main pog = instant win
- **Texture:** Character's pog face art
- **Side Band:** Character's secondary palette color
- **Bottom:** Character's accent palette color

---

## 7. Slammer Mechanics

### 7.1 Launch Physics

The slammer spawns at `(0, 4.0, ±0.1)` and is launched toward a target point on the stack:

```
Target = (sin(aimAngle) × 0.25, 0.4, cos(aimAngle) × 0.25 × zSign)
```

- **Impulse:** `direction × speed × mass`
- **Speed:** `(6 + power/10 × 12) × (0.4 + powerPercent × 0.6)`
- **Spin:** Torque impulse perpendicular to horizontal direction
- **Spin magnitude:** `(0.02 + spin/10 × 0.18) × powerPercent`

### 7.2 Aim System

- **Range:** ±69° (1.15 × π/3 radians)
- **Slider:** Horizontal range input, center = 0° (straight at stack)
- **Visual:** Dashed blue line from spawn to target + blue sphere marker at spawn

### 7.3 Power Meter

- **Type:** Oscillating sine wave (0% to 100%)
- **Speed:** `6.0 - (control/10) × 4.8` rad/s
  - Control 9 (Aoi) → 1.68 rad/s (slow, easy to time)
  - Control 3 (Lumina) → 4.56 rad/s (fast, hard to time)
- **Sweet spot:** 85-95% (visual indicator on power bar)
- **Launch formula:** `baseSpeed × (0.4 + lockedPower/100 × 0.6)`
  - At 0% power: 40% of base speed
  - At 100% power: 100% of base speed

### 7.4 Settling Detection

The slammer is considered "settled" when:
- Linear velocity < 0.3 m/s for 1.0 consecutive seconds, OR
- 6.0 seconds have elapsed since launch (hard timeout)

### 7.5 Rotation Air Resistance

After the slammer hits any pog for the first time:
- Angular velocity is damped by 12% per frame
- This prevents infinite spinning and ensures the slammer comes to rest naturally
- Only triggered after first pog contact (not during free-fall)

---

## 8. Ring-Out Mechanics (Colosseum)

### 8.1 Concept

A circular colosseum ring encloses the play area. Pogs that flip **outside** this ring do not score.

### 8.2 Implementation

- **Visual:** Transparent ring with white outlines, vertical pillar segments, and a top rim (1.0m tall)
- **Physics:** 20 thin cuboid colliders forming a low bumper wall
- **Check:** In `PogDisc.tsx`, when a flip is detected, the pog's center distance from `(0, 0, 0)` is calculated. If `distance > colosseumRadius` (4.5m), the flip is ignored.

### 8.3 Strategic Implications

- High-spin characters can knock pogs outside the ring, wasting flips
- Heavy characters with focused impact are less likely to ring-out
- The colosseum wall acts as a bumper, potentially bouncing pogs back in

---

## 9. Popup System

### 9.1 Popup Types

| Popup | Trigger | Position | Duration | Auto-dismiss |
|-------|---------|----------|----------|--------------|
| **Taunt** | Round start (attacker's turn begins) | Center (full screen) | 1.6s | Yes |
| **Critical** | Attacker slams ≥2 pogs in one shot | Top-right | 2.2s | Yes |
| **Defeat** | Defender got slammed ≥2 pogs in one shot | Bottom-left | 3.0s | Yes |

### 9.2 Simultaneous Popups

Critical and Defeat popups can appear **simultaneously** — they occupy different screen positions (top-right vs bottom-left) and have independent timers. Both trigger when a single shot flips ≥2 stack pogs.

### 9.3 Popup Art

Each character has 3 popup images (critical, defeat, taunt):
- **Size:** Landscape 16:9
- **Style:** Anime cel-shaded, full-body action poses
- **Prompt source:** `src/art/prompts/popups.ts`
- **Fallback:** If image fails to load, shows character name + archetype on colored background

### 9.4 Dismissal

- Auto-dismiss after duration timer
- Click/tap to dismiss early
- Popups are queued (multiple can stack)

---

## 10. Item System (Rogue-Lite)

### 10.1 Current Items

Items are equipped via the Dev Menu (wrench icon, top-right). In future versions, items will be acquired through gameplay.

#### Pocket Lighter
- **Physics:** ×0.85 mass (lighter), ×1.2 spin (more spin), +0.1 restitution (bouncier)
- **Visual:** Slammer becomes a bent U-shape (banana arc, ~32° bend)
- **Strategy:** Faster, spinnier, bouncier — chaotic but less controlled

#### Chewing Gum
- **Physics:** +0.08 kg mass (heavier), ×1.3 spin, ×1.5 friction
- **Visual:** Pink blob on slammer's bottom face
- **Special:** Pogs that collide with the slammer stick to it (velocity blending spring)
- **Strategy:** Drags pogs along, creating cluster flips

#### Baby Oil
- **Physics:** No slammer effect; instead, opponent's pogs become slippery during their turn
- **Slippery effects:** ×0.3 friction, +0.25 restitution on affected pogs
- **Strategy:** Defensive — makes opponent's pogs slide away instead of flipping

#### Magnets
- **Physics:** ×1.5 spin (dramatic spin boost)
- **Visual:** Glowing cyan torus ring around slammer
- **Future:** Metallic pog attraction (planned for elemental patch)
- **Strategy:** Pure offensive — massive scatter potential

### 10.2 Item Physics Pipeline

```
Character Base Stat
       │
       ▼
STAT_PHYSICS converter (constants.ts)
       │
       ▼
Base physics value (mass, spin, restitution, friction)
       │
       ▼
itemPhysics.computeSlammer*(base, equippedItems)
       │
       ▼
Final value → RigidBody props
```

### 10.3 Adding New Items

1. Add `ItemId` to `src/game/items/types.ts`
2. Add item entry to `ITEM_CATALOG` in `src/game/items/catalog.ts`
3. Add computation logic to `src/game/items/itemPhysics.ts` if new modifier type
4. Add visual rendering in `Slammer.tsx` if new `visualType`
5. Test in Dev Menu

**Item Design Guidelines:**
- Each item should have a clear identity (offensive, defensive, chaotic)
- Items should modify existing physics, not add entirely new systems
- Visual changes should reflect physics changes (heavier = bigger, spinnier = glowing, etc.)

---

## 11. AI Behavior

### 11.1 Decision Algorithm

The AI (`aiBrain.ts`) makes two decisions each turn:

**Aim:**
- Target: Stack centroid (angle = 0)
- Noise: Gaussian distribution, σ = `(1 - control/10) × 0.6 + 0.05`
- Result: High-control AI is very precise; low-control AI is very wild

**Power:**
- Base: `30 + (power/10) × 45` → 30-75%
- Round bias: `+3% per round` (AI tries harder as match progresses)
- Variance: ±10% random
- Clamped to 20-95%

### 11.2 AI Personality by Character

| Character | Aim Precision | Power Tendency | Feel |
|-----------|--------------|----------------|------|
| Aoi (control 9) | Very precise (±0.11 rad) | Moderate (48-85%) | Consistent, methodical |
| Lumina (control 3) | Very wild (±0.45 rad) | High (57-95%) | Aggressive, unpredictable |
| Kuroe (control 6) | Moderate (±0.29 rad) | Moderate (48-85%) | Steady pressure |

### 11.3 Future AI Improvements

- Adaptive strategy (react to player's patterns)
- Difficulty levels (easy/normal/hard)
- Target selection (aim at specific pogs, not just center)
- Item usage strategy

---

## 12. Art Asset Pipeline

### 12.1 Pog Textures

- **Size:** Square (1:1)
- **Content:** Character portrait, top-down circular face art
- **Style:** Anime cel-shaded, vibrant, centered face, clean white background
- **Prompts:** `src/art/prompts/pogTextures.ts`
- **Output:** `public/art/{charId}-pog.png`

### 12.2 Popup Art

- **Size:** Landscape 16:9
- **Content:** Full-body action pose (critical/defeat/taunt)
- **Style:** Anime cel-shaded, dramatic lighting, dynamic pose, gradient background
- **Prompts:** `src/art/prompts/popups.ts`
- **Output:** `public/art/{charId}-popup-{action}.png`

### 12.3 Art Generation

Art is generated using SDXL (Stable Diffusion XL) with prompts from the `prompts/` directory. The `scripts/generate-placeholders.cjs` script can generate placeholder art using Node.js canvas.

### 12.4 Asset URL Resolution

Assets are resolved via `src/art/assets.ts`, which uses `import.meta.env.BASE_URL` to handle both local dev (`/art/...`) and GitHub Pages (`/Poggers/art/...`) base paths automatically.

---

## 13. Balancing Notes

### Current Balance State

- **School Girl (Aoi):** Favored for beginners. High control makes power timing easy, but low power means fewer flips per shot.
- **Magic Girl (Lumina):** High variance. Can score big with lucky shots, but misses often. Light weight means less flip force despite high power.
- **Older Sister (Kuroe):** Consistent performer. Heavy weight + high bounce creates reliable multi-hit flips. Moderate control is accessible.

### Known Balance Issues

- `criticalThreshold` lowered from 4 to 2 — popups may trigger too frequently
- Player wins ties (favoritism) — could be changed to "sudden death" round
- Baby Oil is purely defensive and doesn't help the user score

### Tuning Guide

All tunable values are in `src/game/physics/constants.ts`:

- **To make matches shorter:** Reduce `MATCH.maxRounds`
- **To make pogs easier to flip:** Reduce `STAT_PHYSICS.pogMass` or increase `pogRestitution`
- **To make the power meter easier:** Reduce `powerMeterSpeed` range
- **To make the colosseum bigger/smaller:** Adjust `ARENA.colosseumRadius`
- **To reduce popup frequency:** Increase `MATCH.criticalThreshold`
