// Physics + arena tuning constants.
// All units are SI-ish (meters, kg, m/s) inside the Rapier simulation.

export const ARENA = {
  floorSize: 12,           // square floor side length (m)
  floorFriction: 0.6,
  floorRestitution: 0.3,
  // Stack of 8 neutral pogs at arena center
  stackCount: 8,
  stackRadius: 0.5,        // pog disc radius (m)
  stackHeight: 0.05,       // pog disc thickness (m)
  stackGap: 0.005,         // tiny gap between stacked pogs to avoid initial jitter
  // Player + AI main pogs (the "king" pogs that, if flipped, end the match)
  mainPogOffset: 4.2,      // distance from center along z axis
  // Slammer spawns high above the stack and crashes straight down onto it.
  // Aim angle controls left/right horizontal offset at impact.
  // Power controls the downward launch speed (higher = more force).
  slammerSpawnHeight: 4.0,
  slammerAimRadius: 0.25, // how far left/right aim can shift the impact point
  // Target height on the stack (where the slammer is aimed at)
  slammerTargetHeight: 0.4, // top of the stack
  slammerRadius: 0.3, // smaller than pogs so it can hit off-center for more flip
  slammerHeight: 0.1, // slightly thicker for more mass
} as const

// Stat-to-physics conversion helpers. Stats are 1-10; we map to physical values.
export const STAT_PHYSICS = {
  // Slammer mass: 0.15kg (light) to 0.5kg (heavy) — much heavier than pogs
  slammerMass: (weightStat: number) => 0.15 + (weightStat / 10) * 0.35,
  // Slammer restitution: 0.05 (dead blow) to 0.35 (some bounce)
  slammerRestitution: (bounceStat: number) => 0.05 + (bounceStat / 10) * 0.3,
  // Pog mass: very light, fixed for stack pogs (so all stack pogs behave identically)
  pogMass: 0.008,
  pogRestitution: 0.4, // bouncier so pogs pop up when hit from above
  pogFriction: 0.5,
  // Launch velocity magnitude: 6 m/s (weak) to 18 m/s (strong)
  launchSpeed: (powerStat: number, lockedPower: number) => {
    // lockedPower is 0-100 from the power meter
    const baseSpeed = 6 + (powerStat / 10) * 12
    return baseSpeed * (0.4 + (lockedPower / 100) * 0.6) // 40%-100% of base depending on timing
  },
  // Spin (torque impulse magnitude): 0.02 to 0.2
  spinImpulse: (spinStat: number, lockedPower: number) => {
    return (0.02 + (spinStat / 10) * 0.18) * (lockedPower / 100)
  },
  // Aim angle range: ±60 degrees
  aimRangeRad: Math.PI / 3,
  // Power meter oscillation speed: high-control = slow oscillation.
  // Returns radians per second (the meter is a sine wave).
  powerMeterSpeed: (controlStat: number) => {
    // control 1 → 6.0 rad/s (fast, hard), control 10 → 1.2 rad/s (slow, easy)
    return 6.0 - (controlStat / 10) * 4.8
  },
} as const

// Settling detection for end-of-shot resolution.
export const RESOLUTION = {
  // Slammer is "at rest" when linear velocity magnitude is below this (m/s)
  slammerRestThreshold: 0.3,
  // Slammer must be at rest for this many seconds before we resolve
  slammerRestDuration: 1.0,
  // Hard timeout: never wait longer than this for a shot to resolve (seconds)
  shotTimeout: 6.0,
} as const

export const MATCH = {
  maxRounds: 5,
  // Number of pogs that must flip in a single shot to trigger the "critical" popup
  criticalThreshold: 4,
} as const
