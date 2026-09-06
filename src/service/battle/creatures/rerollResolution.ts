import type { Dice, Equipment } from '../../../types/game';
import type { CreatureBattleState } from '../../../types/creatures';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { getEffectiveFace } from '../../dice/diceFaces';
import { choose, combatNumber } from './creatureState';
import { createResolutionContext } from './resolutionContext';
import { resolveIdentities } from './identityResolution';

export interface RerollStep { dieIndex: number; rolledIndices: number[]; state: CreatureBattleState }

export function refreshAuthorityTargets(dice: Dice[], indices: number[], equipment: Equipment[], state: CreatureBattleState) {
  const c = createResolutionContext(dice, indices, equipment, state, { control: 0, maxControl: 3, gold: 0 });
  resolveIdentities(c);
  const authorityTargets: CreatureBattleState['authorityTargets'] = {};
  for (const event of c.events) if (event.sourceDiceId && event.ability === '賞你個名分') {
    const target = event.identities[0];
    if (target) authorityTargets[event.sourceDiceId] = { diceId: target.diceId, version: state.faceVersions[target.diceId] ?? 0 };
  }
  return { ...state, authorityTargets };
}

/** Resolve one user action and its finite prankster chain, recording each real reroll. */
export function resolveRerollChain(dice: Dice[], indices: number[], state: CreatureBattleState,
  targetIndex: number, equipment: Equipment[], random: () => number = Math.random,
  teacherId?: string): RerollStep[] {
  const rolled = [...indices];
  let next = structuredClone(state);
  if (teacherId) next.teachersAvailable = next.teachersAvailable.filter((id) => id !== teacherId);
  const queue = [{ index: targetIndex, forced: Boolean(teacherId), teacher: Boolean(teacherId) }];
  const steps: RerollStep[] = [];
  while (queue.length) {
    const action = queue.shift()!;
    const die = dice[action.index];
    if (action.forced && next.lockedDice.includes(die.id)) continue;
    const previous = getEffectiveFace(die.faces[rolled[action.index]]);
    dice.forEach((source, index) => {
      if (getEffectiveFace(source.faces[rolled[index]]).creature === 'priest') {
        next.priestAttacks[source.id] = combatNumber((next.priestAttacks[source.id] ?? 0) + b.priest.damagePerReroll);
      }
    });
    if (previous.creature === 'coward' && next.cowardShields[die.id] === undefined) next.cowardShields[die.id] = previous.baseValue;
    if (previous.creature === 'prankster' && !next.prankstersUsed.includes(die.id)) {
      next.prankstersUsed.push(die.id);
      const neighbors = dice.flatMap((entry, index) => Math.abs(index - action.index) === 1
        && getEffectiveFace(entry.faces[rolled[index]]).creature !== 'food' && !next.lockedDice.includes(entry.id) ? [index] : []);
      const target = choose(neighbors, next.seed, `prankster:${die.id}`);
      if (target !== undefined) queue.push({ index: target, forced: true, teacher: false });
    }
    rolled[action.index] = Math.floor(random() * die.faces.length);
    next.faceVersions[die.id] = (next.faceVersions[die.id] ?? 0) + 1;
    next.teachersAvailable = next.teachersAvailable.filter((id) => id !== die.id);
    delete next.authorityTargets[die.id];
    delete next.teacherBonuses[die.id];
    const face = getEffectiveFace(die.faces[rolled[action.index]]);
    if (action.teacher && face.baseValue > previous.baseValue) next.teacherBonuses[die.id] = b.teacher.bonus;
    next.rerollCount++;
    next = refreshAuthorityTargets(dice, rolled, equipment, next);
    steps.push({ dieIndex: action.index, rolledIndices: [...rolled], state: structuredClone(next) });
  }
  return steps;
}
