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
  pxPerMsToSpeed: 4.0,     // flick speed (px/ms) → launch speed (m/s)
  throwPitchRad: 0.26,     // ~15° downward pitch — flat menko-style slam; with
                           // spawn height 1.35m this lands 2.7–3.7m out across
                           // the speed range, bracketing the defender at 3.2m
  spinPerSpeed: 1.6,       // rad/s of Y-spin per m/s of launch speed
  maxLandingTiltRad: 0.5,  // worst-case tilt from a crooked flick (~29°)

  // --- Duel structure ---
  maxThrows: 10,           // total throws before the duel is called a draw
  aiThinkMs: 1300,         // rival "thinking" delay before its throw
  aiAimNoise: 0.3,         // m std-dev on the rival's intended landing point
  aiMinStraightness: 0.8,  // rival flick quality range (0.8..1.0)

  // --- Flick gesture sampling ---
  flickWindowMs: 90,       // release velocity read from the last N ms of pointer travel
  minFlickDistPx: 30,      // shorter drags are ignored (not a throw)

  // --- Gust (the air-pressure flip — the game's core novel system) ---
  // A flat, fast slam shoves a ground-level air ring outward; chips inside
  // the ring get lifted at their near edge and tip away from the impact.
  gustRadius: 1.8,          // m, how far the air blast reaches
  gustMinFlatness: 0.25,    // below this |up·y| at impact the gust fizzles
  gustRefSpeed: 10,         // impact speed (m/s) that yields p=1 at distance 0 —
                            // a clean 10 m/s slam right next to the target flips it
  // The gust gives targets a hop + tip (not a raw edge impulse, which spins
  // chips like flipped coins). p = normalized gust power 0..1 at the target:
  gustLift: 1.5,            // m/s upward hop at p=1
  gustSlide: 0.5,           // m/s outward push at p=1
  gustTipOmega: 30,         // rad/s tipping rotation at p=1 (tuned empirically:
                            // ground friction at launch + angular damping eat a
                            // large share; effective max rotation ≈ 200–260°)
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

// Landing-flatness grade shown in the HUD. Straightness is 0..1.
export function landingGrade(straightness: number): 'CLEAN' | 'OK' | 'TILTED' {
  if (straightness > 0.85) return 'CLEAN'
  if (straightness > 0.6) return 'OK'
  return 'TILTED'
}
