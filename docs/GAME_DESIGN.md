# Poggers — Game Design Document

> **Version:** 3.0 (duel era)
> **Last Updated:** 2026-07-04
> **Supersedes:** v2.30 (the pog-stack game, now "Legacy Arena" in the menu)
> Companion docs: `STEAM_RETHINK.md` (strategy), `CHIP_DESIGN_SPACE.md`
> (parameter/mod space), `ART_DIRECTION.md` (visual tokens).

---

## 1. Premise

Year 30XX. After eleven proxy wars, humanity settles all conflict by POG.
Society treats this with total institutional gravity (see ART_DIRECTION —
played straight, never parody). The protagonist is a 2008 human, cryo-frozen
and awakened into this world, carrying **lost POG technology**: the
playground mod arts (lighter-warping, correction-fluid weighting, washers)
that the future has never seen.

- Mods and techniques = recovered 2008 knowledge → the progression fantasy
- Duels are played for keeps — the loser's chip changes pockets
- Official venues enforce weigh-ins; the underground doesn't

## 2. The core duel

Two duelists, a chalk/painted ring, a stack of chips each (default 4, the
first auto-anted into the ring).

**Turn:** pick stance (arc on your own half, A/D) → tap to lock an aim
point → **flick to slam**. Flick speed vs the aim's required ballistic
speed = land short/long; flick straightness = landing flatness + lateral
error. Intent (aim) and execution (snap) are separate skills.

**The gust:** a flat, fast slam blasts air outward at ground level. Chips
inside the radius get an upward near-edge impulse — the physics solver
pivots them over their grounded far edge, exactly like the real
air-pressure flip. Strength scales with impact speed × landing flatness² ×
thrower weight; falloff is linear with distance; the target's shape
(camber shield, thickness lip) scales what it catches.

**Sweet spots:** the flip band lives at ~0.9–1.3 m center distance.
Landing closer than ~0.9 m overlaps the target and **pins** it (a real
menko tactic — smother a chip to protect or neutralize it).

**Outcomes at settle (refereed in priority order):**
- any chip face-down inside the ring → captured by the other side
  (friendly fire is real — your gust can flip your own chips)
- any chip outside the ring → lost (out of play, nobody scores)
- duel ends when both stacks are thrown (compare captures) or one side
  has nothing left (wipeout)

## 3. Chip parameters

Per-chip `ChipParams` drive all physics (see CHIP_DESIGN_SPACE.md for the
full space):

| Param | Offense | Defense |
|---|---|---|
| `weight` | Stronger gust output (momentum into the slap) | Needs more impulse to flip |
| `camber` | Can't land flat → weaker own gust | Sheds incoming gusts; full camber ≈ unflippable by raw power |
| `thickness` | (comes with weight when painted) | LIABILITY: tall rim is a lip the gust catches |

Starter types: **Standard**, **White-Out** (立可白: w1.5/t1.5 — offense
chip with a lip defect), **Warped** (lighter: c0.75 — turtle with weak
slams). Balance is physically derived, not rule-based.

## 4. Keepsies economy

- Your **collection** persists across duels. Chips you flip off rivals
  join it (marked ★), with their params. Chips you lose are gone.
- **Workbench** between duels: Burn (+0.25 camber) / Paint (+0.25 weight
  AND thickness). Supplies limited; +1 each per duel won. Mods compound.
- Lineup order matters: first 4 chips enter the duel; the first is your
  ante.
- Cleaned out → fresh starter pack (the corner store).

## 5. Venues

| | OFFICIAL ARENA | UNDERGROUND DEN |
|---|---|---|
| Look | dusty-cream daylight, vending-cyan ring | oil-black, sodium-orange light |
| Rules | weigh-in: rivals play clean | none: rivals bring modded chips |
| Fiction | televised civic fairness | the shadow economy |

## 6. Story mode (the ladder)

A sequence of named rivals, each a venue + themed roster + AI skill +
dialogue. Winning advances; losing offers a rematch (collection persists,
so losses genuinely hurt). The ladder doubles as the tutorial: each rival
teaches a mechanic by embodying it.

Current ladder (`src/game/duel/story.ts`):

1. **Aoi** — Official, clean Standards, gentle aim. Teaches the basics.
2. **Lumina** — Official, White-Outs, wild power. Teaches lip-punishing.
3. **Kuroe** — Underground, heavily modded roster, precise. Teaches
   turtle-handling and den rules.

Planned: district tournament → the World POG Council (wars settled five
chips at a time). Dialogue is deadpan — the world is serious about this.

## 7. Presentation

- Lens-profile chips: bright owner-colored top (face art later — the
  collectible side), dark bottom with a **universal seal marking** so
  face-down reads instantly at any distance.
- Juice: slam clack (synth placeholder → recorded plastic), hitstop,
  gust shockwave ring, wobble slow-mo + camera push-in at the tipping
  point (THE clip moment).
- HUD: turn/stance/aim hints, throw stats (speed / power-match / snap
  grade), stacks + captures tally, workbench on game-over.

## 8. Tuning

All knobs in `src/game/duel/duelConstants.ts`, commented. Key measured
facts (do not re-derive by feel):

- Flip window (standard chip, edge impulse): teeter < 0.035 N·s, clean
  flip 0.04–0.08, over-rotation ≥ 0.10. Curve: J = 0.018 + 0.055·p,
  saturated at 0.085·weight (never somersaults).
- Chips lie down after passing 107° tilt (post-inversion spin damper) —
  without it a tipped lens rolls like a wheel and the outcome is parity.
- The slam eats thrower momentum (`slamVelocityKeep`) — flat slam ≈ dead
  stop, so aim point = destination.

## 9. Legacy Arena

The v2.x pog-stack game (slammer dropped on an 8-pog stack) is kept as a
menu curiosity under "Legacy Arena". Not maintained; will be removed or
reworked as a bonus minigame once the campaign ships.
