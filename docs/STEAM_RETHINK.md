# Poggers → Steam: Project Rethink

> **Date:** 2026-07-04
> **Status:** Proposal, for discussion
> **Inputs:** Market research (Steam comps), cultural research (鬥片/menko/ddakji), current prototype (v2.30)

---

## 1. The verdict in one paragraph

The niche is empty and the formula is proven. There is **no dedicated menko/ddakji/鬥片 game on Steam**, while Squid Game made the slam-and-flip gesture globally recognizable for free. Meanwhile *From The Top* (Beyblade → Slay-the-Spire roguelite, $4, Very Positive) and *Slayblade* (wishlist-stage, heavy press) have just validated the exact "childhood battle toy → roguelite" formula, and Balatro/Buckshot Roulette prove the ceiling of "simple traditional game + streamable drama." The prototype's bones (stat→physics pipeline, item system) are good, but the current game is a pogs-style *stack bombing* game. The rethink: pivot the core to the authentic **鬥片 duel** — slam your chip beside the opponent's to flip it with wind and edge impact — and wrap it in a **mod-crafting roguelite with keepsies stakes** (lose the duel, lose your chip).

---

## 2. What the research found

### 2.1 Market (full brief from research agent)

| Signal | Fact |
|---|---|
| White space | Zero menko/ddakji/pog games on Steam (only a ddakji *minigame* inside "Come to my party!") |
| Formula proof | From The Top: released 2025-12, $4, ~133 reviews, 85% positive — Beyblade × Slay the Spire |
| Playbook | Slayblade: sells the *era/feeling*, never says "Beyblade"; ships zh-TW/JA at launch; Next Fest demo → press |
| Ceiling | Balatro $14.99 / 5M+ units; Buckshot Roulette $2.99 / 6M+ — both won on streamability |
| Free awareness | Ddakji is the first game in Squid Game; slam-flip content is a standing TikTok/YouTube genre |
| Sequencing | Every comp shipped single-player first; multiplayer only after traction (Buckshot) |

**Positioning takeaways:** occupy the niche loudly ("the flip-slam game" — Squid Game hook for discovery, 鬥片 heritage for authenticity); copy the Balatro *structure* not just the theme; price $4–6 impulse band; localize zh-TW/JA/KO/EN from day one; Next Fest demo before launch.

### 2.2 Culture & physics (full brief from research agent)

The real game's depth lives in three places, all currently absent from the prototype:

1. **The air-pressure flip.** Skilled players don't hit the target chip — they slam *beside* it (~5 cm), landing flat and clean so the ground-level gust gets under the target's edge and flips it. Direct edge impact is the second, cruder mechanism. Technique = wrist snap, near-parallel landing angle, planting your foot as a "wind wall," Korean 칼치기 (knife-slide under the defender).
2. **Mod-as-tradeoff crafting.** Every documented playground mod is a stat trade, not power creep:
   - 立可白 layering → +weight/+thickness, but a thicker chip exposes its own edge (easier to flip *you*) — the Korean ddakji thickness dilemma is explicit folk knowledge
   - 打火機 lighter-warping → camber/dome = strong defense (wind slips off, no lip to catch) but changes your own attack arc
   - Wax/oil rub (menko) → +weight/+stiffness, −friction
   - Hidden washer under a glued layer → center-weighted mass, banned-tier
   - Layer-gluing cardboard → thickness/stiffness
3. **Keepsies.** Winner takes the flipped chip — permanently. This is why schools banned it, and it's the emotional engine: winning a rival's hand-modded treasure, losing your crafted champion.

Also valuable: ground surface matters (concrete favors the air game, dirt/carpet kill it → arena modifiers); chip artwork rarity was half the value (布袋戲 heroes, anime licenses → collectible art system); regional names for flavor (尪仔標、ㄅㄧㄚˋ公、翹牌、公仔紙…).

---

## 3. Gap analysis: prototype vs. this vision

| Current prototype | Problem | Direction |
|---|---|---|
| Slammer drops from 4 m onto a neutral 8-pog stack | That's 90s Hawaiian pogs, not 鬥片; no slam gesture, no air game | Core becomes a **1v1 ground-level slam duel**; stack mode can survive as a bonus/boss variant |
| Aim slider + oscillating power meter | Passive timing minigame; the market brief says the tactile slam is the streamable money moment | **Mouse flick/drag = the throw** (velocity, angle, wrist-snap curve read from the gesture) |
| Pure rigid-body physics (Rapier) | No aerodynamics → the entire real skill layer (gust flips, camber defense) can't exist | Add a **custom gust system** (see §5) — this is the game's one novel tech investment |
| Items = 4 match modifiers via dev menu | No acquisition, no economy, no run | Items become **crafting mods applied between fights**, with trade-offs; acquired at shops/events |
| Character stats drive the slammer | The *chip* should be the build; characters are opponents | Rivals = characters with personality/AI style; **your chips = your deck/build** |
| Single exhibition match vs AI | A demo, not a product | **Roguelite run**: node map, rival duels, shops, crafting events, elite chip-holders, boss |
| Score = flips counted, nothing at stake | No keepsies = no drama | **Wager chips every duel.** Win theirs (mods and art included), lose yours on a flip |

What to **keep**: the Zustand phase machine, the declarative item→physics pipeline (already the right architecture for a big mod catalog), flip detection via up-vector, the popup/taunt personality layer, the character roster as rivals.

---

## 4. The proposed game

**Elevator pitch:** *The flip-slam game from your childhood (and that Squid Game scene), rebuilt as a physics roguelite. Slam your chip to flip theirs. Winner keeps the chip. Burn yours with a lighter, paint it with correction fluid, wax it — every mod is a trade-off. Lose your champion and it's gone.*

### 4.1 Core loop (one duel, ~60–90 seconds)
1. Both players stake a chip. Yours lies on the ground — its mods visibly shaping it (camber dome, white-out crust, waxy sheen).
2. On your turn: pick your throw chip, **flick to slam** — where you land relative to the defender decides gust vs. edge-impact; landing flat and clean maximizes the gust.
3. The defender chip catches air, lifts, wobbles… slow-mo on near-flips (**the clip moment** — Buckshot's shotgun, our coin-flutter).
4. Alternate until a chip flips. **Winner pockets it.**

### 4.2 Run structure (Slay-the-Spire node map, ~30–45 min)
- Theme: an 80s–90s Taiwanese schoolyard → back alley → night market → the legendary arcade rooftop.
- Nodes: rival duels · 柑仔店 corner-store shop (buy chips, mod supplies) · crafting events (borrow the big kid's lighter…) · gamble events (掀牌 number-betting from the Chinese rule set) · elite rivals holding rare/legendary chips · a boss with a banned-tier washer-weighted monster.
- Your collection is your health bar: run ends when you're out of chips worth staking.

### 4.3 The mod system (the soul of the game)
Every chip has real physics parameters: **weight, thickness, camber, stiffness, friction, edge shape**. Mods move them with authentic trade-offs:

| Mod (real!) | Up | Down |
|---|---|---|
| 立可白 correction fluid | +weight, +impact | +thickness → your own edge is easier to catch |
| Lighter warp | +camber → gusts slip off you | wobblier, less predictable attack arc |
| Wax rub | +stiffness, +weight | −friction → you slide on landing |
| Hidden washer | center mass, brutal slams | risk: "inspection" events can disqualify it |
| Layer glue | +stiffness, +thickness | thickness downside again |

Chip art = rarity/collection layer (puppet-theater heroes, tokusatsu knockoffs, holo variants). Techniques (foot-wall, 칼치기 knife-slide, fan-flip) unlock as run-level skills.

### 4.4 Arenas
Surface changes the meta: concrete (air game strong) · dirt (impact game) · carpet/classroom (gusts dead — forces edge play) · rooftop wind, rain puddles as hazards.

### 4.5 What the current characters become
Aoi/Lumina/Kuroe become **rival duelists** with AI personalities, taunt popups (already built), and signature chips you can win off them. The popup/anime presentation layer survives intact — it's the game's charm channel.

---

## 5. The one novel tech system: the gust

Rapier gives rigid bodies for free but no air. The flip physics needs a custom, gameplay-legible aerodynamics fake:

- On slam contact with ground, compute a **radial impulse field** at ground level from impact point, magnitude from landing flatness × velocity (a tilted landing leaks the gust).
- For each nearby chip, sample the field at its edge facing the impact; apply lift + torque scaled by how much **lip** it exposes: `exposure = f(thickness, camber, edge shape)` — camber-domed chips shed the gust, thick chips catch it.
- Foot-wall technique = a placed occluder that reflects/concentrates the field.
- Tune for drama: flips should hang at the tipping point (add angular damping near 90°) so every near-flip wobbles.

This single system is what makes every mod mechanically real instead of cosmetic, and it's ~pure gameplay code on top of the existing Rapier setup.

## 6. Tech stack recommendation

**Keep the TypeScript/R3F/Rapier stack through the Next Fest demo; wrap with Electron (steamworks.js) for Steam.** Rationale:
- Speed is the strategic weapon — the niche is empty *today*, Slayblade launches soon, and the team already has velocity in this stack.
- The web-stack-on-Steam path is proven (Vampire Survivors 1.0, shapez, Cross Blitz).
- The gust system is engine-agnostic gameplay code; nothing here needs Godot/Unity-specific features.
- Revisit only if: perf problems on low-end hardware, console ambitions, or online PvP gets prioritized (then Godot 4 port, after the design is validated).

Practical to-dos: window packaging (Electron + steamworks.js), gamepad support, save system, settings (the GH Pages build stays as the marketing/demo page).

## 7. Identity & naming note

"Poggers" is a strong meme word but points at *pogs* + Twitch slang, and Twitch-adjacent trademark noise is worth checking before committing. The rethink leans 鬥片/ddakji duel, not pogs — consider titles that sell the slam ("keepsies" is an evocative English word; 鬥片 romanizations; Squid-Game-adjacent "the flip game"). Decision needed before the Steam page goes up, not before prototyping.

## 8. Roadmap to Steam

| Phase | Duration | Goal |
|---|---|---|
| **1. Find the fun** | 2–4 wks | New core: flick-throw + gust system + keepsies duel vs 1 AI rival, greybox. Kill criterion: if the near-flip wobble isn't exciting in playtests, iterate here — do not build the roguelite on a dead core |
| **2. Vertical slice** | 4–6 wks | One full run: ~12 chips, 6 mods, 3 rivals + 1 boss, 2 surfaces, shop + craft nodes |
| **3. Steam page live** | with slice | Capsule art, trailer built on the slow-mo flip; tags: Roguelite, Physics, Casual, PvE; hook line references the Squid Game gesture. Wishlists start compounding now |
| **4. Next Fest demo** | next window | Demo = 1 run, 20–30 min. zh-TW/EN minimum, JA/KO if possible. Press: Taiwanese outlets have a natural authenticity story |
| **5. Launch 1.0** | ~6 mo total | $4.99. Full localization zh-TW/JA/KO/EN. Post-launch: daily challenge, endless mode, then evaluate PvP |

---

## 9. Open questions for the team

1. **Art direction:** keep Neo-Arcade Y2K CRT, or shift toward Taiwanese retro (柑仔店 / 布袋戲 print aesthetics)? The research says the *era* is the product; current CRT style says "arcade," not "schoolyard."
2. **Title** (see §7).
3. **How much of the current pogs-stack mode survives?** (Proposal: boss/bonus variant only.)
4. **Scope check:** solo dev or collaborators? The roadmap above assumes roughly one person full-time equivalent with AI-assisted art.
