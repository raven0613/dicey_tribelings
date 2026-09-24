import type { CreatureBattleState } from '../../../types/creatures';

export const createCreatureBattleState = (seed = 1): CreatureBattleState => ({
  round: 0, rollOrigins: {}, imposterTargets: {}, echoUsed: [], gildedFaces: [],
  storedFood: {}, cowardShields: {}, altars: {}, teacherBonuses: {},
  teachersAvailable: [], prankstersUsed: [], faceVersions: {}, authorityTargets: {},
  lockedDice: [], rerollCount: 0, controlSpent: 0, paidRerolls: 0, paidRerollUsed: false, formationUsed: false,
  whistleUsed: false, pipeUsed: false, roundSeed: seed, seed, virtualFood: 0,
});

export function startCreatureRound(state: CreatureBattleState, seed: number): CreatureBattleState {
  return { ...createCreatureBattleState(seed), paidRerolls: state.paidRerolls, storedFood: { ...state.storedFood }, altars: { ...state.altars }, round: state.round + 1, echoUsed: [...state.echoUsed], gildedFaces: [...state.gildedFaces] };
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
