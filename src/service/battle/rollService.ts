import { lockImposterTargets, getRoundFace } from './creatures/imposterResolution';
import type { Dice, Equipment, CombatPhase } from '../../types/game';
import { predetermineRollResults, calculateRollResolution } from './battleEngine';
import type { CreatureBattleState } from '../../types/creatures';
import { createCreatureBattleState, startCreatureRound } from './creatures/creatureState';
import { refreshAuthorityTargets, resolveRerollChain } from './creatures/rerollResolution';
import { findTeacherTargets } from './creatures/rerollTargets';
import { getEffectiveFace } from '../dice/diceFaces';
import { EQUIPMENT_BALANCE as eq, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { getDiceGeometry } from '../dice/diceGeometry';
import { soundService } from '../audio/soundService';

export interface RollState {
  control: number; maxControl: number; gold: number; dicePool: Dice[]; rolledIndices: number[];
  equipments: Equipment[]; combatPhase: CombatPhase; creatureBattleState: CreatureBattleState;
}
export type DiceAction = 'reroll' | 'swap' | 'lock' | 'flip' | `teacher:${string}`;

export function performStartBattleRoll(dicePool: Dice[], equipments: Equipment[],
  state: CreatureBattleState = createCreatureBattleState(),
  battle = { control: 3, maxControl: 3, gold: 0 }, virtualFood = 0, random = Math.random) {
  const rolledIndices = predetermineRollResults(dicePool, random);
  let round = startCreatureRound(state, Math.floor(random() * 0xffffffff));
  round.virtualFood = virtualFood;
  round = lockImposterTargets(dicePool, rolledIndices, round);
  round.teachersAvailable = dicePool.filter((die, index) => getRoundFace(die, rolledIndices[index], round).creature === 'teacher').map((die) => die.id);
  round = refreshAuthorityTargets(dicePool, rolledIndices, equipments, round);
  soundService.playDiceRoll();
  return { rolledIndices, comboSummary: calculateRollResolution(dicePool, rolledIndices, equipments, round, battle),
    combatPhase: 'ROLLING' as const, creatureBattleState: round };
}

export function getOppositeFace(die: Dice, faceIndex: number): number | null {
  const geometry = getDiceGeometry(die.dieType);
  const normal = geometry[faceIndex].normal;
  const opposite = geometry.findIndex((face) => face.normal.reduce((sum, value, index) => sum + value * normal[index], 0) < -0.999);
  return opposite < 0 ? null : opposite;
}

export function teacherTargets(state: RollState, teacherId: string): number[] {
  const items = state.dicePool.map((die, index) => {
    const face = getRoundFace(die, state.rolledIndices[index], state.creatureBattleState);
    return { diceId: die.id, creature: face.creature, baseValue: face.baseValue };
  });
  return findTeacherTargets(items, state.creatureBattleState, teacherId);
}

export function performControlReroll(dieIndex: number, state: RollState, random = Math.random, teacherId?: string) {
  if (state.combatPhase !== 'CONTROL_PHASE' || !state.dicePool[dieIndex]) return null;
  if (teacherId && !teacherTargets(state, teacherId).includes(dieIndex)) return null;
  const paid = !teacherId && state.control === 0 && hasEquipment(state.equipments, 'COUNTERWEIGHT') && state.gold >= eq.paidReroll;
  if (!teacherId && state.control <= 0 && !paid) return null;
  const before = getEffectiveFace(state.dicePool[dieIndex].faces[state.rolledIndices[dieIndex]]).baseValue;
  const cost = teacherId || paid ? 0 : 1;
  const round = { ...state.creatureBattleState, controlSpent: state.creatureBattleState.controlSpent + cost,
    seed: Math.floor(random() * 0xffffffff) };
  const steps = resolveRerollChain(state.dicePool, state.rolledIndices, round, dieIndex, state.equipments, random, teacherId);
  if (!steps.length) return null;
  const first = steps[0];
  const after = getEffectiveFace(state.dicePool[dieIndex].faces[first.rolledIndices[dieIndex]]).baseValue;
  const refund = !teacherId && hasEquipment(state.equipments, 'PIPE') && !round.pipeUsed && after <= before ? eq.pipeRefund : 0;
  if (refund) steps.forEach((step) => { step.state.pipeUsed = true; });
  soundService.playControlReroll();
  return { steps, control: Math.min(state.maxControl + eq.controlHeadroom, state.control - cost + refund),
    gold: state.gold - (paid ? eq.paidReroll : 0) };
}

export function performDiceAction(action: Exclude<DiceAction, 'reroll'>, index: number, state: RollState) {
  if (state.combatPhase !== 'CONTROL_PHASE') return null;
  const die = state.dicePool[index];
  if (!die) return null;
  const round = structuredClone(state.creatureBattleState);
  let pool = [...state.dicePool];
  let rolled = [...state.rolledIndices];
  let cost = 0;
  if (action === 'swap') {
    if (!hasEquipment(state.equipments, 'FORMATION') || round.formationUsed || index >= pool.length - 1) return null;
    cost = eq.formationCost; round.formationUsed = true;
    [pool[index], pool[index + 1]] = [pool[index + 1], pool[index]];
    [rolled[index], rolled[index + 1]] = [rolled[index + 1], rolled[index]];
  } else if (action === 'lock') {
    if (!hasEquipment(state.equipments, 'WHISTLE') || round.whistleUsed) return null;
    cost = eq.whistleCost; round.whistleUsed = true; round.lockedDice.push(die.id);
  } else if (action === 'flip') {
    if (!hasEquipment(state.equipments, 'PRISM')) return null;
    const opposite = getOppositeFace(die, rolled[index]);
    if (opposite === null) return null;
    cost = eq.prismCost; rolled[index] = opposite;
    round.faceVersions[die.id] = (round.faceVersions[die.id] ?? 0) + 1;
    round.teachersAvailable = round.teachersAvailable.filter((id) => id !== die.id);
    delete round.teacherBonuses[die.id]; delete round.authorityTargets[die.id];
  } else return null;
  if (state.control < cost) return null;
  round.controlSpent += cost;
  const creatureBattleState = refreshAuthorityTargets(pool, rolled, state.equipments, round);
  const control = state.control - cost;
  return { dicePool: pool, rolledIndices: rolled, creatureBattleState, control,
    comboSummary: calculateRollResolution(pool, rolled, state.equipments, creatureBattleState, { ...state, control }) };
}
