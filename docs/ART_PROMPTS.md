# Art Generation Prompts

> Copy-paste prompts for the missing assets. Match docs/ART_DIRECTION.md.
> Output goes in `public/art/` with the exact filenames below — the code
> picks them up automatically. Style anchor for everything: *2000s anime
> retro-future, Soft Retro-Future Urbanism, played straight (no parody),
> palette: dusty cream / oxidized teal / vending-machine cyan / sunset
> pink; undercity: sodium orange / dirty magenta / oil black.*

## 1. Shizuka popup set → `shizuka-popup-{taunt,critical,defeat}.png` (16:9)

Base description (append the per-mood line):

> 2000s anime cel-shaded illustration, a severe elegant woman in her 30s,
> Council Auditor uniform: long tailored charcoal coat with oxidized-teal
> trim, white gloves, thin rimless glasses, sleek black hair in a tight
> bun, small silver POG-seal insignia at the collar. Dramatic institutional
> lighting, dusty-cream and teal palette with signal-red accent. Landscape
> 16:9, dynamic full-body action pose, gradient background.

- **taunt**: pose: presenting an audit ledger with one hand, cold
  confident smile, chips floating in ordered rows behind her
- **critical**: pose: mid-throw follow-through, coat flaring, eyes sharp,
  shockwave ring at her feet
- **defeat**: pose: kneeling, glasses cracked, ledger pages scattering,
  disbelief

## 2. Dialogue portraits (better than the 16:9 cards) → `{charId}-portrait-{taunt,critical,defeat}.png`

Portrait spec: full-body isolated character, **transparent background**
(PNG), 832×1216 portrait, 2000s anime cel-shaded, clean line art, feet
visible, facing slightly left (the dialogue box sits below them).

- `schoolgirl` (Aoi): navy sailor-style civic uniform, red scarf, white
  gloves, prim posture, four seminar badges on the sleeve
- `magicalgirl` (Lumina): idol-league stage outfit, pink/lavender/gold,
  ring-light halo prop, holding an oversized certified-heavy cap
- `oldersister` (Kuroe): crimson-and-black work jacket over utility wear,
  sodium-orange rim light, cigarette-less toothpick, tunnel den behind
  rendered as glow only
- `shizuka`: as above (Council Auditor)

Moods: taunt (confident), critical (triumphant), defeat (broken).

## 3. Chip face art → `chipface-{01..08}.png` (1:1, 1024×1024)

> Circular POG cap face design filling the frame, 2000s anime print
> style, bold silhouette readable at small size, thin border ring.

Eight faces, one line each:
1. state seal: stylized ✕ over a laurel, dusty cream / signal red
2. idol-league star portrait, pink/gold foil look
3. glove-puppet warrior hero (布袋戲 homage), ornate
4. vending machine mascot, vending-cyan
5. megablock skyline at dusk, sunset pink
6. koi-and-coin lucky print, teal
7. "WW XI VETERAN" commemorative scissors-beats-paper emblem
8. redacted Council cap: black with a silver audit stamp

## 4. Clean venue backdrops (regen of the cropped concept art)

- `backdrop-official.jpg` — 2048×1024: anime retro-future megablock
  skyline at dusk seen from a plaza, patched facades, glowing retrofit
  balconies, skybridges, no people, no text, no watermark
- `backdrop-underground.jpg` — 2048×1024: damp service tunnel wide shot,
  sodium-orange tube lamps, curtained stalls, REPAIR kiosk glow in
  dirty magenta, no people, no text

## Sizes & format cheatsheet

| Asset | Size | Format |
|---|---|---|
| popup art | 1344×768-ish 16:9 | png/jpg |
| portraits | 832×1216, transparent | png |
| chip faces | 1024×1024 | png |
| backdrops | 2048×1024 | jpg |
