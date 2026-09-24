/** Dice font sizes use the shared 100 × 100 face canvas; damage pops use game-stage units. */
export const DICE_NUMBER_FEEDBACK = {
  font: { min: 28, max: 50, reference: 80 },
  peak: { min: 1.2, max: 1.5 },
  // Roll to the result, pop beyond its resting size, then settle (milliseconds).
  timing: { rollMs: 180, popMs: 70, settleMs: 210 },
  glyphWidth: 0.65,
  resourcePulse: { small: 1.05, large: 1.1, threshold: 20, peakFraction: 0.3 },
} as const;

export const DAMAGE_POP_PRESENTATION = {
  font: { min: 48, max: 128, reference: 80 },
  peak: { min: 1.2, max: 1.45 },
  lifetimeMs: 900,
  entryScale: 0.45,
  entryStretch: 1.25,
  // Stage-unit launch height grows with damage; rise is the later upward drift.
  launch: { min: 24, max: 60 },
  reboundScale: 0.94,
  reboundHeight: 0.78,
  reboundFraction: 0.2,
  peakFraction: 0.09,
  settleFraction: 0.32,
  fadeFraction: 0.55,
  rise: 46,
  lineHeight: 1.1,
  slotGap: 8,
  edgeMargin: 8,
  anchorGap: 6,
  searchStep: 24,
  spreadWidth: 560,
  defaultColor: '#e9d5ff',
  strokeColor: '#101827',
  strokeWidth: 1.5,
} as const;
