// Duel mode tuning constants (Phase 1 prototype).
// SI-ish units inside Rapier (meters, kg, m/s), same convention as constants.ts.

export const DUEL = {
  // --- Arena ---
  groundSize: 14,          // square concrete slab side length (m)
  groundFriction: 0.7,
  groundRestitution: 0.12,
  circleRadius: 3.2,       // chalk circle = ring-out boundary (visual only in CP1)

  // --- Chips ---
  chipRadius: 0.45,
  chipThickness: 0.05,
  chipMass: 0.03,
  chipFriction: 0.6,
  chipRestitution: 0.12, // real chips slap dead — energy goes into the clack,
                         // not a rebound; also keeps max-power slams in-ring
  chipSegments: 12,        // low-poly cylinder segments

  // Defender chip lies flat near the circle center
  defenderPos: [0, 0.03, -0.5] as const,

  // --- Throw ---
  // The attacker chip is "in hand" above the player's edge of the circle.
  spawnPos: [0, 1.35, 2.7] as const,
  minSpeed: 4.5,           // m/s, weakest meaningful slam
  maxSpeed: 16,            // m/s, full wrist snap
  pxPerMsToSpeed: 5.5,     // flick speed (px/ms) → launch speed (m/s) — a
                           // comfortable ~2.2px/ms snap reaches 12 m/s (full
                           // ring range) without wrist strain
  throwPitchRad: 0.26,     // ~15° downward pitch — flat menko-style slam; with
                           // spawn height 1.35m this lands 2.7–3.7m out across
                           // the speed range, bracketing the defender at 3.2m
  spinPerSpeed: 1.6,       // rad/s of Y-spin per m/s of launch speed
  maxLandingTiltRad: 0.5,  // worst-case tilt from a crooked flick (~29°)

  // --- Duel structure ---
  stackSize: 4,            // chips per side; chip 0 is auto-anted into the ring
  aiThinkMs: 1300,         // rival "thinking" delay before its throw
  aiAimNoise: 0.28,        // m std-dev on the rival's intended landing point
  aiSpeedNoise: 0.1,       // fractional noise on the rival's throw power
  aiMinStraightness: 0.8,  // rival flick quality range (0.8..1.0)

  // Ante spots: each side's first chip starts in the ring (slightly on
  // their own half, offset sideways so they don't align boringly).
  anteOffsetZ: 0.9,
  anteOffsetX: 0.4,

  // Pile spots: remaining stack chips sit beside the ring, by the owner.
  pilePos: [2.1, 2.4] as const, // |x|, |z| — sign by side

  // --- Aim-then-snap ---
  aimMinDist: 1.2,         // m from hand — can't slam at your own feet
  lateralErrRad: 0.12,     // max direction error at straightness 0

  // --- Stance (throw position along your own half's arc) ---
  stanceMaxRad: 1.22,      // ±70° around your edge of the ring
  stanceKeyStep: 0.05,     // radians per key repeat (A/D, arrows)

  // --- Flick gesture sampling ---
  flickWindowMs: 90,       // release velocity read from the last N ms of pointer travel
  minFlickDistPx: 30,      // shorter drags are ignored (not a throw)

  // --- Gust (the air-pressure flip — the game's core novel system) ---
  // A flat, fast slam shoves a ground-level air ring outward; chips inside
  // the ring get lifted at their near edge and tip away from the impact.
  gustRadius: 2.2,          // m, how far the air blast reaches. Chips are
                            // 0.45m radius, so center distances under ~0.9m
                            // mean overlap (= pinning); the flip band must
                            // live at 0.9–1.3m, hence the generous reach.
  gustMinFlatness: 0.25,    // below this |up·y| at impact the gust fizzles
  gustRefSpeed: 8,          // impact speed (m/s) that yields p=1 at distance 0.
                            // At a full 12 m/s slam: p≈0.82 at 1.0m, 0.61 at
                            // 1.3m — flips come from landing with a small gap
  // The gust lifts the target's NEAR edge with an impulse; the contact
  // solver turns that into a pivot about the grounded far edge — the real
  // flip motion. p = normalized gust power 0..1 at the target.
  // J = base + scale·p N·s at the edge of the 0.03kg chip: flip threshold
  // sits around J≈0.05; the +scale ceiling stays below somersault territory.
  gustEdgeImpulseBase: 0.018,
  gustEdgeImpulseScale: 0.055,
  gustJSomersault: 0.085,      // N·s per unit weight — impulse saturates here so
                               // extra power NEVER somersaults a chip back upright.
                               // Measured on the lens chip (with the lie-down
                               // damper): teeter <0.035, clean flips 0.04–0.08,
                               // over-rotation returns ≥0.10.
  // Chip-parameter physics (the mod system's foundation):
  camberFlatnessPenalty: 0.3,  // a domed chip can't land flat → weaker own gust
  camberExposureShield: 0.65,  // …but sheds incoming gusts (defense) — a fully
                               // warped chip can't be flipped by raw power alone
  thicknessExposureLip: 0.45,  // a tall rim is a lip the gust catches (per +100% thickness)
  minExposure: 0.15,           // no chip is fully gust-proof
  gustSlide: 0.3,           // outward fraction of the edge impulse
  gustPreLift: 0.02,        // m — unstick the target from the ground before the
                            // kick so the rising rim doesn't grind away the spin
  slamVelocityKeep: 0.18,   // fraction of the thrower's velocity surviving a
                            // flat slam (the slap absorbs the rest); a tilted
                            // landing keeps more and skids — up to this + 0.4

  // --- Juice ---
  hitstopMs: 70,            // physics freeze on slam impact
  slowmoScale: 0.25,        // time scale while the defender teeters
  slowmoMaxSec: 1.4,        // per-throw cap so slow-mo can't stall the game
  wobbleEnter: 0.6,         // defender up·y below this (≈53° tilt) → slow-mo
  wobbleExit: 0.85,         // up·y above this (or fully flipped) → normal speed

  // --- Settle detection (same approach as RESOLUTION in constants.ts) ---
  restSpeed: 0.25,         // m/s
  restDuration: 0.6,       // s below restSpeed before we call it settled
  flightTimeout: 5,        // s hard cap per throw
} as const

// Venue skins — palette tokens from docs/ART_DIRECTION.md.
export type VenueId = 'official' | 'underground'

export const VENUES: Record<
  VenueId,
  {
    name: string
    bg: string
    floor: string
    ring: string
    ringOpacity: number
    ambient: { color: string; intensity: number }
    key: { color: string; intensity: number; pos: [number, number, number] }
    fill: { color: string; intensity: number; pos: [number, number, number] }
    hudAccent: string
    // Rules: does the rival bring modded chips?
    rivalMods: boolean
  }
> = {
  official: {
    name: 'OFFICIAL ARENA',
    bg: '#c9c2b2',          // dusty-cream sky, washed
    floor: '#9a968c',       // concrete-gray
    ring: '#5fd4e0',        // vending-cyan ring markings
    ringOpacity: 0.8,
    ambient: { color: '#e8dfc9', intensity: 0.65 },
    key: { color: '#ffffff', intensity: 1.3, pos: [4, 8, 3] },
    fill: { color: '#f2a7b8', intensity: 0.35, pos: [-5, 4, -4] }, // sunset-pink rim
    hudAccent: '#4e8a80',   // oxidized-teal
    rivalMods: false,       // weigh-in enforced: clean chips only
  },
  underground: {
    name: 'UNDERGROUND DEN',
    bg: '#16141a',          // oil-black
    floor: '#5a5750',       // wet-gray
    ring: '#e8963c',        // rough sodium/signal ring
    ringOpacity: 0.65,
    ambient: { color: '#6a5a48', intensity: 0.3 },
    key: { color: '#e8963c', intensity: 1.6, pos: [2, 6, 1] },     // sodium tube
    fill: { color: '#c04f8a', intensity: 0.5, pos: [-4, 3, -3] }, // dirty-magenta
    hudAccent: '#e8963c',
    rivalMods: true,        // anything goes down here
  },
}

// Landing-flatness grade shown in the HUD. Straightness is 0..1.
export function landingGrade(straightness: number): 'CLEAN' | 'OK' | 'TILTED' {
  if (straightness > 0.85) return 'CLEAN'
  if (straightness > 0.6) return 'OK'
  return 'TILTED'
}
