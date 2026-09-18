import { getPaidRerollCost } from './rerollCost';
import { EQUIPMENT_ACTIONS } from '../../configs/equipment/equipmentActionConfig';
import { lockImposterTargets, getRoundFace } from './creatures/imposterResolution';
import type { Enemy, Dice, Equipment, CombatPhase } from '../../types/game';
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
  currentEnemy?: Enemy | null;
  control: number; maxControl: number; gold: number; dicePool: Dice[]; rolledIndices: number[];
  equipments: Equipment[]; combatPhase: CombatPhase; creatureBattleState: CreatureBattleState;
}
export type DiceAction = 'reroll' | 'swap' | 'lock' | 'flip' | `teacher:${string}`;

export function performStartBattleRoll(dicePool: Dice[], equipments: Equipment[],
  state: CreatureBattleState = createCreatureBattleState(),
  battle: import('../../types/battle').BattleContext = { control: 3, maxControl: 3, gold: 0 }, virtualFood = 0, random = Math.random) {
  const rolledIndices = predetermineRollResults(dicePool, random);
  let round = startCreatureRound(state, Math.floor(random() * 0xffffffff));
  round.virtualFood = virtualFood;
  round.sealedDice = battle.currentEnemy && 'sealedDie' in battle.currentEnemy && battle.currentEnemy.sealedDie ? [battle.currentEnemy.sealedDie] : [];
  round.rerolledDice = [];
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
  const action: DiceAction = teacherId ? `teacher:${teacherId}` : 'reroll';
  if (!getActionTargets(action, state).includes(dieIndex)) return null;
  const paid = !teacherId && state.control === 0;
  const goldCost = paid ? getPaidRerollCost(state.creatureBattleState.paidRerolls, state.equipments) : 0;
  const before = getEffectiveFace(state.dicePool[dieIndex].faces[state.rolledIndices[dieIndex]]).baseValue;
  const cost = teacherId || paid ? 0 : 1;
  const round = { ...state.creatureBattleState, controlSpent: state.creatureBattleState.controlSpent + cost,
    paidRerolls: state.creatureBattleState.paidRerolls + Number(paid),
    paidRerollUsed: state.creatureBattleState.paidRerollUsed || paid,
    seed: Math.floor(random() * 0xffffffff) };
  const steps = resolveRerollChain(state.dicePool, state.rolledIndices, round, dieIndex, state.equipments, random, teacherId);
  if (!steps.length) return null;
  const first = steps[0];
  const after = getEffectiveFace(state.dicePool[dieIndex].faces[first.rolledIndices[dieIndex]]).baseValue;
  const refund = cost > 0 && hasEquipment(state.equipments, 'PIPE') && !round.pipeUsed && after <= before ? Math.min(cost, eq.pipeRefund) : 0;
  if (refund) steps.forEach((step) => { step.state.pipeUsed = true; });
  soundService.playControlReroll();
  return { steps, control: Math.min(state.maxControl + eq.controlHeadroom, state.control - cost + refund),
    gold: state.gold - goldCost };
}

export function performDiceAction(action: Exclude<DiceAction, 'reroll'>, index: number, state: RollState) {
  if (action.startsWith('teacher:') || !getActionTargets(action, state).includes(index)) return null;
  const die = state.dicePool[index];
  const round = structuredClone(state.creatureBattleState);
  const pool = [...state.dicePool];
  const rolled = [...state.rolledIndices];
  let cost = 0;
  if (action === 'swap') {
    cost = eq.formationCost; round.formationUsed = true;
    [pool[index], pool[index + 1]] = [pool[index + 1], pool[index]];
    [rolled[index], rolled[index + 1]] = [rolled[index + 1], rolled[index]];
  } else if (action === 'lock') {
    cost = eq.whistleCost; round.whistleUsed = true; round.lockedDice.push(die.id);
  } else if (action === 'flip') {
    const opposite = getOppositeFace(die, rolled[index])!;
    cost = eq.prismCost; rolled[index] = opposite;
    round.faceVersions[die.id] = (round.faceVersions[die.id] ?? 0) + 1;
    round.teachersAvailable = round.teachersAvailable.filter((id) => id !== die.id);
    delete round.teacherBonuses[die.id]; delete round.authorityTargets[die.id];
  } else return null;
  round.controlSpent += cost;
  const creatureBattleState = refreshAuthorityTargets(pool, rolled, state.equipments, round);
  const control = state.control - cost;
  return { dicePool: pool, rolledIndices: rolled, creatureBattleState, control,
    comboSummary: calculateRollResolution(pool, rolled, state.equipments, creatureBattleState, { ...state, control }) };
}

export function getEquipmentAction(ruleId: string) {
  return EQUIPMENT_ACTIONS[ruleId as keyof typeof EQUIPMENT_ACTIONS];
}

export function getActionTargets(action: DiceAction, state: RollState): number[] {
  if (state.combatPhase !== 'CONTROL_PHASE') return [];
  if (action.startsWith('teacher:')) return teacherTargets(state, action.slice(8));
  const config = Object.entries(EQUIPMENT_ACTIONS).find(([, item]) => item.action === action);
  if (action !== 'reroll' && (!config || !state.equipments.some((eq) => eq.ruleId === config[0]))) return [];
  const round = state.creatureBattleState;
  if (action === 'reroll' && state.control <= 0 && state.gold < getPaidRerollCost(round.paidRerolls, state.equipments)) return [];
  if (config) {
    const definition = config[1];
    if (state.control < definition.cost) return [];
  }
  if ((action === 'swap' && round.formationUsed) || (action === 'lock' && round.whistleUsed)) return [];
  return state.dicePool.flatMap((die, index) => {
    if (action === 'swap') return index < state.dicePool.length - 1 ? [index] : [];
    if (action === 'lock') return [index];
    if (round.sealedDice?.includes(die.id)) return [];
    if (action === 'flip' && getOppositeFace(die, state.rolledIndices[index]) === null) return [];
    return [index];
  });
}
