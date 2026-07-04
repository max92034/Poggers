# Poggers — UI Design System

> **Version:** 2.30  
> **Last Updated:** 2026-07-03  
> **Design Direction:** Neo-Arcade Combat Arena  
> **Inspiration:** Street Fighter 6, Persona 5, classic arcade fighting games

---

## 1. Design Philosophy

The visual identity is **"Neo-Arcade Combat Arena"** — a fusion of retro arcade aesthetics with modern fighting-game UI design. The goal is to make every screen feel like a fighting game matchup, not a casual mobile game.

### Core Principles

1. **Angular, not rounded** — Clip-paths create aggressive, combat-feel shapes
2. **High contrast** — Dark backgrounds with vibrant accent pops
3. **Layered atmosphere** — Film grain, CRT scanlines, and glow effects add depth
4. **Typographic hierarchy** — Orbitron for impact, Space Grotesk for readability
5. **Purposeful animation** — Every motion serves feedback or atmosphere

---

## 2. Color Palette

### 2.1 Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0a0a0f` | App background (near-black) |
| `--bg-elevated` | `#12121a` | Elevated surfaces |
| `--panel` | `#161622` | Panel backgrounds |
| `--panel-2` | `#1e1e2e` | Secondary panels, inputs |
| `--border` | `#2a2a3d` | Borders, dividers |

### 2.2 Accent Colors

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| `--accent` | `#ff2a6d` | Hot Magenta | Player side, primary actions, buttons |
| `--accent-light` | `#ff5c8a` | Light Magenta | Button gradients, hovers |
| `--accent-2` | `#05d9e8` | Electric Cyan | AI side, secondary info |
| `--accent-warm` | `#ffb800` | Amber | Sweet spot, critical hits, warnings |
| `--good` | `#00f5d4` | Mint | Positive feedback |
| `--bad` | `#ff2a6d` | Red (same as accent) | Negative feedback |

### 2.3 Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--text` | `#f0f0f5` | Primary text |
| `--text-dim` | `#7a7a8f` | Secondary/label text |

### 2.4 Color Usage Rules

- **Player = Magenta** — All player-associated UI uses `--accent` (hot magenta)
- **AI = Cyan** — All AI-associated UI uses `--accent-2` (electric cyan)
- **Critical/Sweet Spot = Amber** — Power meter sweet spot, critical popup borders
- **Backgrounds are always dark** — Never use light backgrounds
- **Accents are used sparingly** — Dominant dark with sharp color pops

---

## 3. Typography

### 3.1 Font Families

| Token | Font | Usage |
|-------|------|-------|
| `--font-display` | Orbitron (700/800/900) | Headlines, buttons, labels, scores |
| `--font-body` | Space Grotesk (400/500/600/700) | Body text, descriptions, UI content |

**Loaded via Google Fonts in `index.html`:**
```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 3.2 Type Scale

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 10px | Labels, badges, micro-text |
| `--text-sm` | 11px | Secondary labels |
| `--text-base` | 14px | Body text, buttons (secondary) |
| `--text-md` | 16px | Standard body |
| `--text-lg` | 18px | Primary buttons |
| `--text-xl` | 20px | Sub-headlines |
| `--text-2xl` | 24px | Section headers |
| `--text-3xl` | 32px | Screen titles |
| `--text-4xl` | 48px | Large titles |
| `--text-5xl` | 64px | Hero text |
| `--text-display` | clamp(64px, 14vw, 140px) | Main menu title |

### 3.3 Typography Rules

- **Orbitron** is ALWAYS uppercase when used for UI elements
- **Letter-spacing:** 0.04em for display text, 0.08em for buttons/labels
- **Never use Orbitron for long body text** — it's hard to read at small sizes
- **Space Grotesk** for everything else — it's clean, modern, and highly legible

---

## 4. Clip Paths (Angular Shapes)

Angular clip-paths are the signature visual element of the Neo-Arcade aesthetic.

| Token | Shape | Usage |
|-------|-------|-------|
| `--clip-btn` | Parallelogram (8% slant) | Primary buttons |
| `--clip-card` | Octagon (8% corners) | Character cards, panels |
| `--clip-diamond` | Diamond | VS badges, decorative elements |
| `--clip-left-plate` | Left arrow plate | Turn indicator (left side) |
| `--clip-right-plate` | Right arrow plate | Turn indicator (right side) |

```css
--clip-btn: polygon(8% 0, 100% 0, 92% 100%, 0% 100%);
--clip-card: polygon(8% 0, 92% 0, 100% 4%, 100% 96%, 92% 100%, 8% 100%, 0 96%, 0 4%);
--clip-diamond: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
```

---

## 5. Visual Effects

### 5.1 CRT Scanlines (Global)

Applied via `body::after` at z-index 9997:

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9997;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(0, 0, 0, 0.06) 2px, rgba(0, 0, 0, 0.06) 4px
  );
  opacity: 0.4;
}
```

### 5.2 Film Grain (Global)

Applied via `.app-shell::before` at z-index 9998:

- SVG fractal noise texture
- Opacity: 0.4
- Pointer-events: none

### 5.3 Vignette (Gameplay)

Applied via `.game-screen::after`:

- Radial gradient: transparent center → 40% dark edges
- Only on gameplay screen (not menus)

### 5.4 Glow Effects

| Token | Usage |
|-------|-------|
| `--shadow-glow-magenta` | Player-associated glows |
| `--shadow-glow-cyan` | AI-associated glows |
| `--shadow-glow-amber` | Critical/sweet-spot glows |

---

## 6. Animations

### 6.1 Keyframe Library

All animations are defined in `src/index.css` as global keyframes:

| Animation | Duration | Usage |
|-----------|----------|-------|
| `sheen` | 3s | Button shine sweep (left → right) |
| `shimmer` | 2s | Stat bar fill shine |
| `glow-pulse` | 3s | Ambient glow orbs |
| `float` | 3s | Decorative floating elements |
| `vs-pulse` | 1.5s | VS badge scale pulse |
| `glitch` | 0.6s | Text glitch-in effect |
| `impact` | 0.6s | Popup/impact entrance |
| `bg-drift` | 20s | Background glow drift |
| `launch-pulse` | 1.5s | Launch button pulsing glow |

### 6.2 Animation Guidelines

- **Hover states:** Use `filter: brightness(1.15)` and `transform: scale(1.05)` — fast (0.15-0.2s)
- **Entrance:** Use `impact` or `glitch` for high-impact moments
- **Ambient:** Use `float`, `glow-pulse`, `bg-drift` for atmosphere (long durations)
- **Feedback:** Use `sheen` on buttons, `shimmer` on stat bars
- **Never animate position properties (top/left)** — use `transform` for performance

---

## 7. Component Specifications

### 7.1 Buttons

#### Primary Button (`.btn`)

- **Font:** Orbitron, 700 weight, 18px, uppercase, 0.08em letter-spacing
- **Background:** Linear gradient (135deg, `--accent` → `--accent-light`)
- **Color:** `--bg` (dark text on bright button)
- **Clip-path:** `--clip-btn` (parallelogram)
- **Padding:** 18px 48px
- **Effects:** Sheen animation (3s), brightness hover (1.15), scale active (0.97)

#### Secondary Button (`.btn-secondary`)

- **Font:** Space Grotesk, 600 weight, 14px
- **Background:** Transparent with 1px border (`--border`)
- **Color:** `--text`
- **Clip-path:** `--clip-btn`
- **Padding:** 14px 36px
- **Hover:** Background → `--panel-2`

### 7.2 Main Menu

**Layout:** Centered content on dark background with:
- Animated glow orb (top-left, magenta, drifting)
- Decorative pog disc (right side, floating)
- Version number (top-right, dim)
- Title: "Poggers" in Orbitron 900, `--text-display` size
- Subtitle: "Neo-Arcade Combat Arena" in Space Grotesk
- Two buttons: "Enter Arena" (primary), "How to Play" (secondary)

### 7.3 Character Select

**Layout:**
- Header: Back button (left), "Choose your fighter" title (center)
- Cards: 3 equal-width cards, horizontally laid out, responsive to mobile
- Footer: Selected character label + "Start Match" button

**Card Structure:**
```
┌──────────────────────────┐
│  Portrait (character     │  ← Background: character's primary palette
│  pog image, square)      │
├──────────────────────────┤
│  Name + Element badge    │
│  Archetype               │
│  ──────────────────────  │
│  Power     ████████░░  5 │  ← Stat bars with shimmer
│  Spin      ████████░░  5 │
│  Weight    ████████░░  5 │
│  Bounce    ████████░░  5 │
│  Control   █████████░  9 │
│  ──────────────────────  │
│  Tagline text            │
└──────────────────────────┘
```

**Card States:**
- **Default:** `--panel` background, `--border` border
- **Hover:** Slight scale (1.02), border brightens
- **Selected:** Border → character's accent color, glow shadow, checkmark badge

### 7.4 In-Game HUD

#### Turn Indicator (Top)

```
┌─────────────┐  ┌─────────┐  ┌─────────────┐
│  AI Name    │  │ Round   │  │ Player Name │
│  Archetype  │  │  3/5    │  │ Archetype   │
└─────────────┘  └─────────┘  └─────────────┘
                    [Phase Pill]
```

- AI plate (left): Cyan text, `--clip-left-plate` shape
- Player plate (right): Magenta text, `--clip-right-plate` shape
- Round counter (center): Diamond/VS shape
- Phase pill: Below center, shows current phase with icon + text

#### Scoreboard (Sides)

Two score panels, one per side:
- **Player (bottom-left):** Portrait + "You" + score/8
- **AI (top-right):** Portrait + "CPU" + score/8
- Angular clip-path, character-specific glow

#### Aim/Power Control (Bottom)

**Aim Phase:**
```
┌─────────────────────────────────────────────────┐
│  Aim  │  ═════════●═══════════════  │  Lock    │
│       │  -69°    0°    +69°        │           │
└─────────────────────────────────────────────────┘
```

**Power Phase:**
```
┌─────────────────────────────────────────────────┐
│ Power │  ██████████████│░░░│████  │  73%       │
│       │  (gradient fill) (sweet spot)           │
│       │  Launch                                   │
└─────────────────────────────────────────────────┘
```

- Panel: Dark glass-morphism (rgba(10,10,15,0.85) + blur(16px))
- Aim slider: Custom track with gradient (magenta → border → cyan)
- Power bar: Segmented, gradient fill (green → amber → magenta)
- Sweet spot: Dashed amber border at 85-95%
- Launch button: Pulsing magenta gradient

#### Popup Layer

| Popup | Position | Size | Border |
|-------|----------|------|--------|
| Taunt | Center, full screen | 70vw / 720px max | Screen dim background |
| Critical | Top-right | 200px wide | 2px amber + glow |
| Defeat | Bottom-left | 160px wide | 1px magenta, 60% opacity |

- **Image:** `object-fit: contain` to display fully without cropping
- **Aspect ratio:** Set from natural image dimensions on load (4:3 fallback)
- **Entrance:** `impact` animation (scale + rotate)
- **Zoom:** Slow Ken Burns zoom on the image (2.4s)

### 7.5 Result Screen

**Layout:** Centered card on dark background with:
- Glow orb (magenta for win, dim for loss)
- Headline: "Victory" or "Defeat" (Orbitron 900, 64px)
- Score row: Player portrait + score VS AI portrait + score
- Actions: "Play Again" (primary), "Main Menu" (secondary)

---

## 8. Z-Index Hierarchy

| Layer | Z-Index | Element |
|-------|---------|---------|
| Background | 0 | Game canvas, screens |
| Vignette | 5 | `.game-screen::after` |
| In-game UI | 10-50 | AimPower, Scoreboard, TurnIndicator, PopupLayer |
| Dev menu | 9999 | `.dev-menu-wrapper` |
| Film grain | 9998 | `.app-shell::before` |
| CRT scanlines | 9997 | `body::after` |

**Critical rule:** The Dev Menu must be rendered **outside** the `game-screen` div as a sibling, not a child. R3F's Canvas covers all children with its own z-index stacking context.

---

## 9. Responsive Design

### 9.1 Breakpoints

| Breakpoint | Target |
|------------|--------|
| Default | Desktop (> 640px) |
| `max-width: 640px` | Mobile / tablet |
| `max-width: 600px` | Dev menu panel |

### 9.2 Mobile Adaptations

- **Character Select:** Cards stack vertically or become smaller
- **Aim/Power:** Reduced padding, smaller thumb on slider, smaller font sizes
- **Popups:** Smaller dimensions, closer to screen edges
- **Dev Menu:** Full-width panel (92vw)
- **Touch:** `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` set globally

### 9.3 Desktop-Only Features

- OrbitControls (mouse rotate/zoom) — disabled on touch devices
- Hover states — not available on touch

---

## 10. File Organization

CSS files are co-located with their components:

```
src/
├── index.css              # Global: tokens, animations, shared utilities
├── screens/
│   ├── MainMenu.css       # Main menu specific
│   ├── CharacterSelect.css # Character select specific
│   └── ResultScreen.css   # Result screen specific
└── game/ui/
    ├── AimPower.css       # Aim/power control
    ├── DevMenu.css        # Dev menu panel
    ├── PopupLayer.css     # Popup overlays
    ├── Scoreboard.css     # Score panels
    └── TurnIndicator.css  # Top HUD bar
```

### CSS Conventions

- **BEM-like naming:** `.cs-card`, `.cs-card__portrait`, `.cs-card--selected`
- **CSS variables:** All colors, fonts, sizes, clip-paths defined in `:root` in `index.css`
- **No CSS modules** — Plain CSS files with unique class prefixes per component
- **Mobile-first exceptions:** Media queries use `max-width` for mobile overrides

---

## 11. Design Tokens Reference

All tokens are defined in `src/index.css` under `:root`. Here is the complete reference:

```css
:root {
  /* Backgrounds */
  --bg: #0a0a0f;
  --bg-elevated: #12121a;
  --panel: #161622;
  --panel-2: #1e1e2e;
  --border: #2a2a3d;

  /* Text */
  --text: #f0f0f5;
  --text-dim: #7a7a8f;

  /* Accents */
  --accent: #ff2a6d;
  --accent-light: #ff5c8a;
  --accent-2: #05d9e8;
  --accent-warm: #ffb800;
  --good: #00f5d4;
  --warn: #ffb800;
  --bad: #ff2a6d;

  /* Fonts */
  --font-display: 'Orbitron', 'Segoe UI', sans-serif;
  --font-body: 'Space Grotesk', 'Segoe UI', sans-serif;

  /* Type Scale */
  --text-xs: 10px;
  --text-sm: 11px;
  --text-base: 14px;
  --text-md: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 32px;
  --text-4xl: 48px;
  --text-5xl: 64px;
  --text-display: clamp(64px, 14vw, 140px);

  /* Radii */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;

  /* Shadows */
  --shadow-glow-magenta: 0 0 30px rgba(255, 42, 109, 0.3);
  --shadow-glow-cyan: 0 0 30px rgba(5, 217, 232, 0.3);
  --shadow-glow-amber: 0 0 40px rgba(255, 184, 0, 0.4);

  /* Clip Paths */
  --clip-btn: polygon(8% 0, 100% 0, 92% 100%, 0% 100%);
  --clip-card: polygon(8% 0, 92% 0, 100% 4%, 100% 96%, 92% 100%, 8% 100%, 0 96%, 0 4%);
  --clip-diamond: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  --clip-left-plate: polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%);
  --clip-right-plate: polygon(8% 0, 100% 0, 100% 100%, 8% 100%, 0 50%);
}
```

---

## 12. Adding New UI Components

### Checklist

1. **Create `.tsx` and `.css` files** in the appropriate directory (`screens/` or `game/ui/`)
2. **Use design tokens** — Never hardcode colors, fonts, or sizes. Always use CSS variables.
3. **Add responsive styles** — Include `@media (max-width: 640px)` rules
4. **Follow naming conventions** — BEM-like with component-specific prefix
5. **Consider z-index** — Check the z-index hierarchy table above
6. **Test with CRT/ grain** — Ensure component is visible under global overlays
7. **Use Orbitron sparingly** — Only for headlines, buttons, and labels
8. **Apply clip-paths** — Use angular shapes for combat-feel elements

### Example Component Template

```tsx
import './MyComponent.css'

export function MyComponent() {
  return (
    <div className="my-comp">
      <div className="my-comp__header">
        <span className="my-comp__title">Title</span>
      </div>
      <div className="my-comp__body">
        Content
      </div>
    </div>
  )
}
```

```css
.my-comp {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.my-comp__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text);
}

@media (max-width: 640px) {
  .my-comp { padding: 14px; }
  .my-comp__title { font-size: var(--text-base); }
}
```
