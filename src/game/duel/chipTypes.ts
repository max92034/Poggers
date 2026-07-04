export interface ChipParams {
  label: string
  weight: number    // mass multiplier — heavier flips less, slams harder
  camber: number    // 0..1 dome-ness — sheds gusts, but can't land flat
  thickness: number // height multiplier — taller rim = catchable lip
}

export const CHIP_TYPES: Record<string, ChipParams> = {
  standard: { label: 'Standard', weight: 1, camber: 0, thickness: 1 },
  // 立可白: correction-fluid layers — heavy AND thick. Hard to flip by
  // mass, but the built-up rim is a lip the gust can catch.
  whiteout: { label: 'White-Out', weight: 1.5, camber: 0, thickness: 1.5 },
  // Lighter-warped: high camber sheds gusts, but its own slams land
  // domed → weaker gust output.
  warped: { label: 'Warped', weight: 1, camber: 0.75, thickness: 1 },
}
