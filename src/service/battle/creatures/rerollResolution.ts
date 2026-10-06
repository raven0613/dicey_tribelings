import { EQUIPMENT_BALANCE as eq, hasEquipment } from '../../../configs/equipment/equipmentConfig';
import { getEffectiveFace, getFaceTags } from '../../dice/diceFaces';
import { resolveLandingFace } from '../../dice/directionalFaces';
import { refreshImposterTargets, getRoundFace } from './imposterResolution';
import type { Dice, Equipment } from '../../../types/game';
import type { CreatureBattleState } from '../../../types/creatures';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { combatNumber } from './creatureState';
import { createResolutionContext } from './resolutionContext';
import { resolveIdentities } from './identityResolution';
import { findPranksterTargets } from './rerollTargets';

export interface RerollStep { dieIndex: number; rolledIndices: number[]; state: CreatureBattleState }

export function refreshIdentitySnapshot(dice: Dice[], indices: number[], equipment: Equipment[], state: CreatureBattleState,
  changedDice: readonly string[] = []) {
  state = refreshImposterTargets(dice, indices, state);
  const initial = Object.keys(state.identitySnapshot).length === 0;
  const changed = new Set(initial ? dice.map(die => die.id) : changedDice);
  const raw = Object.fromEntries(dice.map((die, index) => [die.id, getFaceTags(getEffectiveFace(die.faces[indices[index]])).sort().join(',')]));
  const c = createResolutionContext(dice, indices, equipment, state, { control: 0, maxControl: 3, gold: 0 });
  resolveIdentities(c);
  const snapshot = Object.fromEntries(c.items.map(item => [item.diceId, [...item.tags].sort().join(',')]));
  let changes = state.identityChanges;
  const observed = { ...raw };
  for (const die of dice) if (changed.has(die.id) && !initial && state.identitySnapshot[die.id] !== raw[die.id]) changes++;
  for (const event of c.log.timeline) for (const identity of event.identities) {
    const next = [...identity.tags].sort().join(',');
    if (changed.has(identity.diceId) && observed[identity.diceId] !== next) changes++;
    observed[identity.diceId] = next;
  }
  for (const die of dice) if (!changed.has(die.id) && state.identitySnapshot[die.id] !== snapshot[die.id]) changes++;
  return { ...state, identitySnapshot: snapshot, identityChanges: changes };
}

/** Resolve one user action and its finite prankster chain, recording each real reroll. */
export function resolveRerollChain(dice: Dice[], indices: number[], state: CreatureBattleState,
  targetIndex: number, equipment: Equipment[], random: () => number = Math.random,
  teacherId?: string): RerollStep[] {
  const rolled = [...indices];
  let next = structuredClone(refreshImposterTargets(dice, indices, state));
  next.rerollEchoes = [];
  const useEcho = (diceId: string, face: Dice['faces'][number]) => {
    if (face.material !== 'echo' || next.echoUsed.includes(face.id)) return false;
    next.echoUsed.push(face.id);
    next.rerollEchoes!.push({ diceId, skill: face.creature });
    return true;
  };
  if (teacherId) {
    next.teachersAvailable = next.teachersAvailable.filter((id) => id !== teacherId);
    const index = dice.findIndex((die) => die.id === teacherId);
    if (index >= 0 && useEcho(teacherId, getRoundFace(dice[index], rolled[index], next))) next.teachersAvailable.push(teacherId);
  }
  const queue: { index: number; forced: boolean; teacher: boolean; inherit?: boolean }[] = [{ index: targetIndex, forced: Boolean(teacherId), teacher: Boolean(teacherId) }];
  const echoQueue: typeof queue = [];
  const steps: RerollStep[] = [];
  while (queue.length || echoQueue.length) {
    const action = queue.shift() ?? echoQueue.shift()!;
    const die = dice[action.index];
    if (action.forced && next.lockedDice.includes(die.id)) continue;
    if (next.sealedDice?.includes(die.id)) continue;
    const previous = getRoundFace(die, rolled[action.index], next);
    if (next.altars[die.id] !== undefined) next.altars[die.id]++;
    if (previous.creature === 'coward' && next.cowardShields[die.id] === undefined)
      next.cowardShields[die.id] = Math.ceil(combatNumber(previous.baseValue * (previous.baseValue > 0 && useEcho(die.id, previous) ? 2 : 1)));
    if (previous.creature === 'prankster' && !next.prankstersUsed.includes(die.id)) {
      next.prankstersUsed.push(die.id);
      const neighbors = findPranksterTargets(dice.map((entry, index) => ({ diceId: entry.id,
        ...getRoundFace(entry, rolled[index], next) })), next, action.index);
      queue.push(...neighbors.map(index => ({ index, forced: true, teacher: false, inherit: true })));
      if (neighbors.length && useEcho(die.id, previous)) echoQueue.push(...neighbors.map(index => ({ index, forced: true, teacher: false, inherit: true })));
    }
    const previousPip = die.faces[rolled[action.index]].baseValue;
    delete next.inheritance[die.id]; delete next.firstRerollMemory[die.id];
    next.chargeLayers[die.id] = 0;
    if (!next.firstRerollUsed) {
      next.firstRerollUsed = true;
      if (hasEquipment(equipment, 'REROLL_MEMORY')) next.firstRerollMemory[die.id] = previous.baseValue * eq.rerollMemory;
    }

    const otherFace = Math.floor(random() * (die.faces.length - 1));
    const origin = otherFace >= rolled[action.index] ? otherFace + 1 : otherFace;
    next.rollOrigins[die.id] = origin;
    rolled[action.index] = resolveLandingFace(die, origin);
    next.faceVersions[die.id] = (next.faceVersions[die.id] ?? 0) + 1;
    next.teachersAvailable = next.teachersAvailable.filter((id) => id !== die.id);
    delete next.teacherBonuses[die.id];
    next = refreshImposterTargets(dice, rolled, next);
    const face = getRoundFace(die, rolled[action.index], next);
    next.rerollCount++;
    if (action.inherit) next.inheritance[die.id] = previous.baseValue * b.prankster.inheritance;
    if (hasEquipment(equipment, 'REROLL_DROP') && previous.baseValue > face.baseValue)
      next.rerollBonuses.push({ diceId: die.id, damage: combatNumber(previous.baseValue - face.baseValue) });
    if (action.teacher && die.faces[rolled[action.index]].baseValue > previousPip) next.teacherBonuses[die.id] = b.teacher.bonus * next.rerollCount;
    next.rerolledDice = [...new Set([...(next.rerolledDice ?? []), die.id])];
    next = refreshIdentitySnapshot(dice, rolled, equipment, next, [die.id]);
    steps.push({ dieIndex: action.index, rolledIndices: [...rolled], state: structuredClone(next) });
  }
  return steps;
}
