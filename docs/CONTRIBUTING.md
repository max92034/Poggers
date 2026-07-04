# Poggers — Contributing Guide

> **Last Updated:** 2026-07-03  
> **Audience:** Collaborators and new contributors

---

## 1. Getting Started

### 1.1 Prerequisites

- **Node.js** 20+ (required for Vite and Rapier WASM)
- **npm** 10+ (comes with Node.js)
- **Git**
- A modern browser with WebGL 2.0 support (Chrome, Firefox, Edge, Safari 15+)

### 1.2 Clone & Install

```bash
git clone https://github.com/max92034/Poggers.git
cd Poggers
npm install
```

> **Note:** The `@react-three/rapier` package ships a WASM binary. Vite is configured to exclude it from dependency optimization. If you see WASM loading errors, clear your cache: `rm -rf node_modules/.vite` and restart.

### 1.3 Development Server

```bash
npm run dev
```

This starts the Vite dev server at `http://localhost:5173`. Hot Module Replacement (HMR) is enabled — most changes appear instantly without a full page reload.

### 1.4 Production Build

```bash
npm run build     # tsc -b && vite build → ./dist/
npm run preview   # Preview the production build locally
```

### 1.5 Deployment

Pushing to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which:
1. Installs dependencies (`npm ci`)
2. Builds the project (`npm run build`)
3. Deploys `./dist/` to GitHub Pages

**Live URL:** https://max92034.github.io/Poggers/

---

## 2. Project Conventions

### 2.1 Code Style

- **Language:** TypeScript (strict mode enabled in `tsconfig.json`)
- **Framework:** React 18 with functional components and hooks
- **State:** Zustand (no Redux, no Context API for game state)
- **Styling:** Plain CSS files co-located with components (no CSS-in-JS, no Tailwind)
- **Icons:** `lucide-react` (import only what you need)
- **Naming:** PascalCase for components, camelCase for functions/variables

### 2.2 TypeScript Rules

The project uses strict TypeScript with these additional checks:
- `noUnusedLocals` — No unused local variables
- `noUnusedParameters` — No unused function parameters
- `noFallthroughCasesInSwitch` — No fallthrough in switch cases

If you have unused parameters (e.g., in event handlers), prefix them with `_`:
```typescript
const handleEvent = (_event: Event) => { /* ... */ }
```

### 2.3 CSS Conventions

- **BEM-like naming:** `.component-name`, `.component-name__element`, `.component-name--modifier`
- **CSS variables:** Always use design tokens from `:root` in `src/index.css`
- **Never hardcode colors** — Use `var(--accent)`, `var(--text)`, etc.
- **Responsive:** Use `@media (max-width: 640px)` for mobile overrides
- **No CSS modules** — Use unique class prefixes per component instead

### 2.4 Import Order

```typescript
// 1. React/library imports
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// 2. Local module imports
import { useGameStore } from '../store/gameStore'
import { getCharacter } from '../characters/roster'

// 3. Type imports
import type { Character } from '../characters/types'

// 4. CSS imports (always last)
import './ComponentName.css'
```

### 2.5 Git Commit Messages

Follow conventional commits:

```
<type>: <description>

types: feat, fix, refactor, docs, chore, style, perf
```

Examples:
```
feat: add Chewing Gum item with sticky physics
fix: prevent slammer from spinning indefinitely after impact
refactor: extract item physics into separate module
docs: add game design document
chore: trigger redeploy
```

---

## 3. Architecture Overview

Before contributing, please read the relevant design documents:

| Document | When to Read |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **Always** — System architecture, tech stack, project structure, state management |
| [GAME_DESIGN.md](./GAME_DESIGN.md) | When working on game mechanics, characters, items, or balancing |
| [UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) | When working on UI, styling, or visual design |

### Key Architectural Concepts

1. **Single Zustand store** — All game state lives in `src/game/store/gameStore.ts`. Both 3D scene components and 2D UI overlays read from the same store.

2. **Screen state machine** — The app has 4 screens (`menu` → `select` → `game` → `result`), controlled by the `screen` field in the store.

3. **Phase state machine** — Within the game screen, a `phase` field drives the game loop (`intro` → `player_aim` → `player_power` → `launching` → `resolving` → `ai_thinking` → loop or `defeat`).

4. **Slammer always mounted** — The slammer RigidBody is never unmounted/remounted (causes Rapier WASM crashes). It switches between `dynamic` and `fixed` body types.

5. **shotId as reset signal** — Each shot increments `shotId`, which PogDiscs use to reset their per-shot flip tracking.

6. **Dev menu outside game-screen** — The DevMenu must be a sibling of `.game-screen`, not a child, because R3F's Canvas creates its own stacking context.

---

## 4. Common Tasks

### 4.1 Adding a New Character

1. **Define the character** in `src/game/characters/roster.ts`:
   ```typescript
   {
     id: 'newchar',
     name: 'Name',
     archetype: 'Archetype',
     element: 'light' | 'arcane' | 'dark',
     palette: { primary: '#hex', secondary: '#hex', accent: '#hex' },
     stats: { power: N, spin: N, weight: N, bounce: N, control: N },
     tagline: 'Short description.',
   }
   ```

2. **Add art prompts** in `src/art/prompts/pogTextures.ts` and `src/art/prompts/popups.ts`

3. **Generate art assets** and place in `public/art/`:
   - `newchar-pog.png` (square, 1:1)
   - `newchar-popup-critical.png` (landscape, 16:9)
   - `newchar-popup-defeat.png` (landscape, 16:9)
   - `newchar-popup-taunt.png` (landscape, 16:9)

4. **Test balance** against existing characters using the stat triangle

### 4.2 Adding a New Item

1. **Add ItemId** to `src/game/items/types.ts`:
   ```typescript
   export type ItemId = 'pocket-lighter' | ... | 'new-item'
   ```

2. **Add item entry** to `ITEM_CATALOG` in `src/game/items/catalog.ts`

3. **Add physics computation** in `src/game/items/itemPhysics.ts` if the item introduces a new modifier type

4. **Add visual rendering** in `src/game/physics/Slammer.tsx` if the item has a new `visualType`

5. **Test** using the Dev Menu (wrench icon, top-right)

### 4.3 Adding a New UI Component

1. Create `.tsx` and `.css` files in the appropriate directory
2. Use design tokens from `src/index.css` (never hardcode colors/fonts)
3. Add responsive styles with `@media (max-width: 640px)`
4. Follow BEM-like naming with a unique prefix
5. Check the z-index hierarchy in [UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md)

### 4.4 Tuning Physics

All tunable values are in `src/game/physics/constants.ts`:

- **Arena dimensions:** `ARENA.*`
- **Stat → physics mapping:** `STAT_PHYSICS.*`
- **Settling detection:** `RESOLUTION.*`
- **Match rules:** `MATCH.*`

### 4.5 Debugging Physics

- **Dev Menu:** Click the wrench icon (top-right) to equip/unequip items
- **OrbitControls:** During non-launching phases, drag to rotate, scroll to zoom
- **Console:** Rapier physics errors appear in the browser console
- **React DevTools:** Inspect the Zustand store state via `useGameStore.getState()`

---

## 5. Known Issues & Gotchas

### 5.1 Rapier WASM

- **Never unmount/remount RigidBody components** — This causes Rapier WASM crashes. Use body type switching (`dynamic` ↔ `fixed`) instead.
- **Vite dependency optimization** — `@react-three/rapier` is excluded from `optimizeDeps` in `vite.config.ts`. If you see WASM loading errors, clear the Vite cache.
- **CCD required** — All dynamic bodies must have `ccd` enabled to prevent tunneling at high speeds.

### 5.2 React Three Fiber

- **Canvas stacking context** — The R3F Canvas creates its own z-index stacking context. UI overlays must be siblings of the Canvas (or outside the `.game-screen` div), not children.
- **useFrame** — Runs every frame inside the Canvas. Don't do heavy computation here. Use refs to avoid re-renders.
- **OrbitControls.makeDefault** — Required to prevent R3F's internal camera management from conflicting with user zoom/rotate input.

### 5.3 State Management

- **Don't call Zustand actions inside useFrame** — This can cause infinite update loops. Use `useGameStore.getState()` for reads, and batch updates.
- **shotId is critical** — If you add new physics objects that track per-shot state, they must reset when `shotId` changes (see `PogDisc.tsx` for the pattern).

### 5.4 CSS

- **CRT scanlines and film grain are global overlays** — They're at z-index 9997-9998. Your components must be below these (z-index < 9997) or they'll be covered.
- **Dev menu is at z-index 9999** — It must be the highest element. Always render it as a sibling of `.game-screen`.

### 5.5 Build

- **`tsc -b` runs before `vite build`** — TypeScript errors will fail the build. Fix all type errors before committing.
- **Large bundle warning** — The build produces a ~3MB JS bundle (mostly Three.js + Rapier WASM). This is expected for a 3D game. Consider code-splitting if the bundle grows significantly.

---

## 6. Testing

### 6.1 Manual Testing Checklist

Before submitting changes, test:

- [ ] **Main Menu:** Title displays, both buttons work, How-to-Play modal opens
- [ ] **Character Select:** All 3 characters selectable, stat bars display, Start Match works
- [ ] **Game Flow:** Aim → Power → Launch → Resolve → Next turn → ... → Result screen
- [ ] **AI Turn:** AI thinks for ~1.5s, then launches automatically
- [ ] **Popups:** Taunt at round start, Critical/Defeat when ≥2 pogs flip, auto-dismiss
- [ ] **Ring-out:** Pogs flipped outside colosseum don't score
- [ ] **Win Condition:** Flipping opponent's main pog ends the match
- [ ] **Dev Menu:** Items equip/unequip correctly, visual changes appear
- [ ] **Mobile:** Test at 375px width (iPhone SE) and 768px width (iPad)
- [ ] **Build:** `npm run build` passes without errors

### 6.2 Browser Testing

Test in at least:
- Chrome (latest)
- Firefox (latest)
- Safari 15+ (if available — WebGL 2.0 required)

### 6.3 Performance

- Target 60fps during gameplay
- Use browser DevTools Performance tab to check for frame drops
- Heavy physics scenes (many pogs bouncing) may dip on lower-end devices
- The `dpr={[1, 2]}` setting on Canvas caps pixel ratio at 2 for performance

---

## 7. Collaboration Workflow

### 7.1 Branch Strategy

- **`main`** — Production branch. Pushing here triggers deployment.
- **Feature branches** — `feat/your-feature-name`, `fix/your-fix-name`
- **Create a branch** for any non-trivial change

```bash
git checkout -b feat/my-feature
# ... make changes ...
git push -u origin feat/my-feature
# Create a Pull Request on GitHub
```

### 7.2 Pull Requests

1. **Describe what changed** and why
2. **Link related issues** (if any)
3. **Include screenshots** for UI changes
4. **Verify the build passes** (`npm run build`)
5. **Test on mobile** (or at least narrow browser window)

### 7.3 Code Review

- Be respectful and constructive
- Focus on correctness, performance, and consistency with the design system
- Check that new code follows the conventions in this document
- Verify that TypeScript strict mode passes

### 7.4 Communication

- **Issues:** Use GitHub Issues for bugs and feature requests
- **Comments:** Use PR comments for code-specific discussions
- **Design discussions:** Reference the design documents (in `docs/`) when discussing changes

---

## 8. File Quick Reference

| What | Where |
|------|-------|
| Game state | `src/game/store/gameStore.ts` |
| Physics constants | `src/game/physics/constants.ts` |
| Character data | `src/game/characters/roster.ts` |
| Item data | `src/game/items/catalog.ts` |
| AI logic | `src/game/ai/aiBrain.ts` |
| 3D scene | `src/game/scenes/ArenaScene.tsx` |
| Slammer physics | `src/game/physics/Slammer.tsx` |
| Pog physics | `src/game/physics/PogDisc.tsx` |
| Design tokens | `src/index.css` (`:root` block) |
| Build config | `vite.config.ts` |
| Deploy config | `.github/workflows/deploy.yml` |

---

## 9. FAQ

**Q: The dev server shows a blank screen with no errors.**  
A: Clear the Vite cache: `rm -rf node_modules/.vite` and restart `npm run dev`. Rapier WASM can sometimes get cached incorrectly.

**Q: My new 3D object isn't visible.**  
A: Check: (1) Is it inside the `<Physics>` component? (2) Does it have a light source? (3) Is the camera looking at it? (4) Is it behind another object?

**Q: My UI component is behind the canvas.**  
A: The R3F Canvas creates a stacking context. Your UI must be a sibling of the Canvas (or outside `.game-screen`), not a child of it. See how `DevMenu` is rendered in `App.tsx`.

**Q: The slammer flies off and never settles.**  
A: Check `RESOLUTION.shotTimeout` (6.0s) — the slammer should settle after this. If not, check that `enterResolving()` is being called in `Slammer.tsx`'s `useFrame` loop.

**Q: TypeScript build fails with "X is declared but never used".**  
A: The project uses `noUnusedLocals` and `noUnusedParameters`. Remove unused variables or prefix parameters with `_`.

**Q: My changes don't appear on the live site.**  
A: Ensure you've pushed to `main` and the GitHub Actions workflow completed successfully. Check the Actions tab on GitHub for any build errors.
