# Chip Design Space — Parameters, Mods, RPS Balance, Skills

> Status: brainstorm reference (2026-07-04). Companion to STEAM_RETHINK.md.
> Physics constants live in `src/game/duel/duelConstants.ts`; per-chip params
> in `ChipParams` (`duelStore.ts`).

## 1. Chip parameters

### Tier A — implemented today (`ChipParams`)

| Param | Physics effect | Trade-off |
|---|---|---|
| `weight` | Mass. More flip resistance; much stronger gust output when thrown (momentum into the slap) | Heavy chips need more snap power to reach distance |
| `camber` (dome) | Sheds incoming gusts (`camberExposureShield`) | Can't land flat → own gust output weakened (`camberFlatnessPenalty`); raised CoM tips easier once caught |
| `thickness` | Taller rim = lip the gust catches (`thicknessExposureLip`) — a LIABILITY | Comes bundled with weight when painted (the real 立可白 trade) |

### Tier B — one-line wiring, Rapier supports natively

| Param | Physics effect | Gameplay identity |
|---|---|---|
| `restitution` (elastic/bounciness) | Bouncy chips hop and skitter on impact instead of slapping dead | Chaotic ricochet chip; bad gust (energy lost to bounce), good at knocking chips around / ring-outs |
| `friction` | Slippery (waxed) chips slide far after landing; also resist being dragged by contact | Skidder — lands then slides into position (or out of the ring: risk) |
| `linearDamping` / `angularDamping` | Air drag; roll tendency after tipping | Floaty vs dead-drop flight; long dramatic rolls vs instant lie-down |
| `radius` (size) | Bigger = easier to hit, catches more gust, pins more area when overlapping | Big = strong pinning wall but easy target; small = evasive, weak pin |
| **CoM offset** (hidden washer!) | Off-center mass via `setAdditionalMassProperties` | Curved flight; lands with a bias — can be tuned to resist tipping in ONE direction only (directional turtle). The banned-tier mod from real menko |

### Tier C — custom code, medium effort

| Param | Effect | Notes |
|---|---|---|
| `aeroLift` / glide | Fake Magnus/glide force while airborne — cambered chips could float, curve mid-air | This is the "affect how it flies" knob; pairs with a curve-throw skill |
| `gustOutputMult` | Slap quality independent of weight (a "cracked" chip slaps weakly) | Lets mods touch offense without mass side-effects |
| `gustExposureMult` | Shield/lip independent of shape | For special chips whose defense isn't geometric |
| `durability` / fragile | Chips crack after N hard impacts (own slams count!); cracked = debuffed (lighter, weak gust), broken = destroyed | Risk economy: the strongest slams damage your own chip. Glass-cannon archetype; also a "chips are consumable" pressure valve |
| `sticky` (gum) | Contacted chips get dragged / can't slide away | Anti-skidder; the CP-old gum item reborn per-chip |
| on-state effects | e.g. "when this chip ends face-down, X" | Design space for legendary chips |

## 2. Mod delivery: attachables vs paint-on

Current mods mutate params directly (burn/paint). The **attachable upgrade**
idea (sockets) is better long-term:

- A chip has 1–2 **slots**; mods are items socketed in (washer, gum wad,
  wax coat, foil edge, sticker seal...).
- Attachments are **visible on the chip** (readability: you can scout a
  rival's loadout by looking).
- Attachments can be **lost on capture with the chip** (keepsies stakes
  compound) or even knocked off by a hard enough slam (counterplay).
- Paint/burn stay as *permanent* body mods (irreversible, scarring the
  base chip); attachments are swappable. Two layers: surgery vs equipment.

## 3. RPS balance skeleton (physically derived, not rule-based)

The trick: each identity's weakness falls out of the physics, no special
rules needed.

```
        HAMMER (heavy + flat + thick)
        strong gust, flips everything thin
           ▲ loses to                ▼ beats
        TURTLE (domed + heavy)      BLADE (light + thin + slick)
        sheds gusts, unflippable    fast skidder, ring-out artist
           ▼ beats                   ▲ loses to
        ...but TURTLE loses to BLADE:
```

- **HAMMER beats BLADE**: thin light chips catch the full gust → flipped.
- **TURTLE beats HAMMER**: dome sheds the gust; hammer's thick rim is
  itself a lip, so a failed hammer slam near a turtle leaves it exposed.
- **BLADE beats TURTLE**: the dome's rounded bottom has a tiny contact
  patch → turtles SLIDE easily. Blades don't try to flip; they skid-slam
  and shove turtles out of the ring (ring-out needs no flip).

Counterplay via aim, stance, and pinning keeps it from being pure
matchup-lottery: a pinned turtle can't be shoved; a hammer landing at a
perfect gap still threatens anything, etc.

## 4. Player shooting skills (the lost arts)

From the cultural research — every one is a real documented technique:

| Skill | Real source | Mechanical sketch |
|---|---|---|
| Wrist Snap | base technique | today's flick; upgrades widen the CLEAN window |
| Foot Wall (풋월/기술) | plant foot beside target to trap the gust | place a small occluder before throwing: gust reflects, +exposure on one side |
| Knife Slide (칼치기) | slide your chip UNDER the defender | low flat skimming throw; flips from beneath — the anti-turtle tech |
| Fan Flip (搧牌) | flip with wind from your hand/sleeve, no contact | a no-chip turn: weak pure-wind gust, zero risk, no chip staked |
| Curve Throw | wrist angle + warped chip | deliberate lateral arc mid-air; attack around a pinning chip |
| Pile Driver | overhead vertical slam | breaks up stacks/pins; high self-flip risk |

Skills as **turn-choice** (pick technique, then aim/snap) with cooldowns
or stamina, or as **loadout picks** before a run. Story-wise these are
the protagonist's forgotten 2008 techniques — see below.

## 5. Story notes (from Desmond, 2026-07-04)

> 30XX: to end the FOREVER WAR, humanity decides everything by
> rock-paper-scissors. WW XII kills 500M. The survivors switch to POG.
> The protagonist: a modern human cryo-frozen in 2008, awakened with
> **lost POG technology** — future people have never seen 立可白.

Why this premise pulls its weight mechanically:

- **"Lost technology" = the mod system's diegetic justification.** The
  future plays POG *pure*; only the protagonist knows burning, painting,
  waxing, washers. Every workbench unlock is literally recovered 2008
  playground knowledge. Tutorial = "remembering."
- **Skills = lost arts** — same justification for the technique tree.
- **RPS is canon**: the previous world order (WW XI was settled by
  rock-paper-scissors) — so the chip-triangle balance IS the in-world
  metagame the future understands, and the protagonist breaks it with
  forbidden mods. The joke and the balance design are the same object.
- **The 2008 protagonist is the nostalgia avatar** — the player's own
  childhood memory personified, which is exactly the Slayblade-style
  "sell the era" positioning.
- The existing anime rival roster (Aoi/Lumina/Kuroe) slots straight in
  as future-era duelists.

Escalation arc writes itself: street duels → district tournament → the
World POG Council, settling wars 5 chips at a time.
