import { lockImposterTargets, getRoundFace } from './imposterResolution';
import type { Dice, Equipment } from '../../../types/game';
import type { CreatureBattleState } from '../../../types/creatures';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { choose, combatNumber } from './creatureState';
import { createResolutionContext } from './resolutionContext';
import { resolveIdentities } from './identityResolution';
import { findPranksterTargets } from './rerollTargets';

export interface RerollStep { dieIndex: number; rolledIndices: number[]; state: CreatureBattleState }

export function refreshAuthorityTargets(dice: Dice[], indices: number[], equipment: Equipment[], state: CreatureBattleState) {
  state = lockImposterTargets(dice, indices, state);
  const c = createResolutionContext(dice, indices, equipment, state, { control: 0, maxControl: 3, gold: 0 });
  resolveIdentities(c);
  const authorityTargets: CreatureBattleState['authorityTargets'] = {};
  for (const event of c.events) if (event.sourceDiceId && event.skill === 'authority') {
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
  let next = structuredClone(lockImposterTargets(dice, indices, state));
  const useEcho = (face: Dice['faces'][number]) => {
    if (face.material !== 'echo' || next.echoUsed.includes(face.id)) return false;
    next.echoUsed.push(face.id); return true;
  };
  if (teacherId) {
    next.teachersAvailable = next.teachersAvailable.filter((id) => id !== teacherId);
    const index = dice.findIndex((die) => die.id === teacherId);
    if (index >= 0 && useEcho(getRoundFace(dice[index], rolled[index], next))) next.teachersAvailable.push(teacherId);
  }
  const queue = [{ index: targetIndex, forced: Boolean(teacherId), teacher: Boolean(teacherId) }];
  const steps: RerollStep[] = [];
  while (queue.length) {
    const action = queue.shift()!;
    const die = dice[action.index];
    if (action.forced && next.lockedDice.includes(die.id)) continue;
    if (next.sealedDice?.includes(die.id)) continue;
    const previous = getRoundFace(die, rolled[action.index], next);
    if (next.altars[die.id] !== undefined) next.altars[die.id]++;
    if (previous.creature === 'coward' && next.cowardShields[die.id] === undefined)
      next.cowardShields[die.id] = previous.baseValue * (previous.baseValue > 0 && useEcho(previous) ? 2 : 1);
    if (previous.creature === 'prankster' && !next.prankstersUsed.includes(die.id)) {
      next.prankstersUsed.push(die.id);
      const neighbors = findPranksterTargets(dice.map((entry, index) => ({ diceId: entry.id,
        ...getRoundFace(entry, rolled[index], next) })), next, action.index);
      const target = choose(neighbors, next.seed, `prankster:${die.id}`);
      if (target !== undefined) {
        queue.push({ index: target, forced: true, teacher: false });
        if (useEcho(previous)) {
          const extra = choose(neighbors, next.seed, `prankster-echo:${die.id}`)!;
          queue.push({ index: extra, forced: true, teacher: false });
        }
      }
    }
    const otherFace = Math.floor(random() * (die.faces.length - 1));
    rolled[action.index] = otherFace >= rolled[action.index] ? otherFace + 1 : otherFace;
    next.faceVersions[die.id] = (next.faceVersions[die.id] ?? 0) + 1;
    next.teachersAvailable = next.teachersAvailable.filter((id) => id !== die.id);
    delete next.authorityTargets[die.id];
    delete next.teacherBonuses[die.id];
    next = lockImposterTargets(dice, rolled, next);
    const face = getRoundFace(die, rolled[action.index], next);
    next.rerollCount++;
    if (action.teacher && face.baseValue > previous.baseValue) next.teacherBonuses[die.id] = b.teacher.bonus * next.rerollCount;
    next.rerolledDice = [...new Set([...(next.rerolledDice ?? []), die.id])];
    next = refreshAuthorityTargets(dice, rolled, equipment, next);
    steps.push({ dieIndex: action.index, rolledIndices: [...rolled], state: structuredClone(next) });
  }
  return steps;
}
