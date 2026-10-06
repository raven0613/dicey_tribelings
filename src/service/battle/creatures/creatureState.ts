import type { CreatureBattleState } from '../../../types/creatures';

export const createCreatureBattleState = (seed = 1): CreatureBattleState => ({
  inheritance: {}, firstRerollUsed: false, firstRerollMemory: {}, rerollBonuses: [], controlPayments: [],
  chargeLayers: {}, absorbTarget: null, splitEnabled: false, firstBonusUsed: false,
  identityChanges: 0, identitySnapshot: {},
  round: 0, manualRerolls: 0, rollOrigins: {}, imposterTargets: {}, imposterCandidates: {}, echoUsed: [], gildedFaces: [],
  storedFood: {}, cowardShields: {}, altars: {}, teacherBonuses: {},
  teachersAvailable: [], prankstersUsed: [], faceVersions: {},
  lockedDice: [], rerollCount: 0, controlSpent: 0, paidRerolls: 0, paidRerollUsed: false, formationUsed: false,
  whistleUsed: false, pipeUsed: false, roundSeed: seed, seed, initialRations: {},
});

export function startCreatureRound(state: CreatureBattleState, seed: number): CreatureBattleState {
  return { ...createCreatureBattleState(seed), chargeLayers: { ...state.chargeLayers }, firstBonusUsed: state.firstBonusUsed, paidRerolls: state.paidRerolls, storedFood: { ...state.storedFood }, altars: { ...state.altars }, round: state.round + 1, echoUsed: [...state.echoUsed], gildedFaces: [...state.gildedFaces] };
}

/** Stable choices are derived from the committed roll seed; previews consume no randomness. */
export function choose<T>(items: readonly T[], seed: number, key: string): T | undefined {
  if (!items.length) return undefined;
  let value = seed >>> 0;
  for (const char of key) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  value ^= value >>> 16;
  return items[(value >>> 0) % items.length];
}
export const combatNumber = (value: number) => Math.round(value * 100) / 100;
