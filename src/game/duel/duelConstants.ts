// Duel mode tuning constants (Phase 1 prototype).
// SI-ish units inside Rapier (meters, kg, m/s), same convention as constants.ts.

export const DUEL = {
  // --- Arena ---
  groundSize: 14,          // square concrete slab side length (m)
  groundFriction: 0.7,
  groundRestitution: 0.25,
  circleRadius: 3.2,       // chalk circle = ring-out boundary (visual only in CP1)

  // --- Chips ---
  chipRadius: 0.45,
  chipThickness: 0.05,
  chipMass: 0.03,
  chipFriction: 0.6,
  chipRestitution: 0.3,
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

  // --- Flick gesture sampling ---
  flickWindowMs: 90,       // release velocity read from the last N ms of pointer travel
  minFlickDistPx: 30,      // shorter drags are ignored (not a throw)

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
