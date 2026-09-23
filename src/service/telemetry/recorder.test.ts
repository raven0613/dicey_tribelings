import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DICE_POOL, INITIAL_EQUIPMENT, INITIAL_MAP_NODES, INITIAL_PLAYER_STATS } from '../../configs/gameConfig';
import { CHAPTER_END_NODE } from '../../configs/regions/mapConfig';
import { BATTLE_LIMIT } from '../../configs/battleConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../configs/equipment/equipmentConfig';
import { createCreatureBattleState } from '../battle/creatures/creatureState';
import { getEnemyForNode } from '../battle/nodeService';
import { RunRecorder } from './recorder';
import { calculateRollResolution } from '../battle/battleEngine';
import { DAMAGE_SOURCE_LABELS } from '../../configs/telemetryConfig';
import type { TelemetryState } from './types';

function initial(): TelemetryState {
  return { playerHp: INITIAL_PLAYER_STATS.hp, maxHp: INITIAL_PLAYER_STATS.maxHp, gold: INITIAL_PLAYER_STATS.gold,
    control: INITIAL_PLAYER_STATS.maxControl, playerShield: 0, dicePool: structuredClone(INITIAL_DICE_POOL),
    equipments: structuredClone(INITIAL_EQUIPMENT), consumableStickers: [], mapNodes: structuredClone(INITIAL_MAP_NODES),
    currentNodeIndex: 0, currentEnemy: null, combatPhase: 'PREPARATION', rolledIndices: [],
    creatureBattleState: createCreatureBattleState(), comboSummary: null, combatImpact: null };
}
function startBattle(state: TelemetryState): TelemetryState {
  return { ...state, currentEnemy: getEnemyForNode(state.mapNodes[state.currentNodeIndex], state.currentNodeIndex) };
}
function roll(state: TelemetryState): TelemetryState {
  return { ...state, combatPhase: 'ROLLING', rolledIndices: state.dicePool.map(() => 0),
    creatureBattleState: { ...state.creatureBattleState, round: state.creatureBattleState.round + 1, rerollCount: 0 } };
}

test('clock excludes inactive intervals and ends permanently at a terminal result', () => {
  const state = initial();
  const recorder = new RunRecorder('run', state, 100, 'test', true);
  recorder.clock(200, false);
  recorder.clock(500, true);
  recorder.finish('abandoned', state, 600);
  recorder.clock(1000, true);
  assert.equal(recorder.record.activeMs, 200);
  assert.equal(recorder.record.elapsedMs, 500);
});

test('rerolls count committed die rerolls once and survive round resets', () => {
  let state = initial();
  const recorder = new RunRecorder('run', state, 0, 'test', true);
  const next = (value: TelemetryState, at: number) => { recorder.observe(value, state, at); state = value; };
  next(startBattle(state), 1);
  next(roll(state), 2);
  next({ ...state, creatureBattleState: { ...state.creatureBattleState, rerollCount: 3 } }, 3);
  next({ ...state, combatPhase: 'CONTROL_PHASE' }, 4);
  next(roll(state), 5);
  next({ ...state, creatureBattleState: { ...state.creatureBattleState, rerollCount: 2 } }, 6);
  assert.equal(recorder.record.battles[0].rerolls, 5);
  assert.deepEqual(recorder.record.battles[0].rounds.map((round) => round.rerolls), [3, 2]);
});

test('death preserves temporary faces and food before battle cleanup, and records actual damage once', () => {
  let state = initial();
  const recorder = new RunRecorder('run', state, 0, 'test', true);
  const next = (value: TelemetryState, at: number) => { recorder.observe(value, state, at); state = value; };
  next(startBattle(state), 1);
  const dice = structuredClone(state.dicePool);
  dice[0].faces[0].temporarySticker = { creature: 'chef', name: CREATURE_CONFIG.chef.name, description: '' };
  next({ ...state, dicePool: dice }, 2);
  next(roll(state), 3);
  const startId = recorder.record.battles[0].startSnapshotId;
  assert.equal(recorder.record.snapshots[startId].dice[0].faces[0].temporarySticker?.creature, 'chef');
  next({ ...state, combatPhase: 'ENEMY_TURN', creatureBattleState: { ...state.creatureBattleState, storedFood: { [dice[0].id]: 8 } } }, 4);
  next({ ...state, playerHp: 0 }, 5);
  next({ ...state }, 6);
  next({ ...state, combatPhase: 'DEFEAT', dicePool: structuredClone(INITIAL_DICE_POOL), creatureBattleState: createCreatureBattleState() }, 7);
  const battle = recorder.record.battles[0];
  const snapshot = recorder.record.snapshots.find((item) => item.id === battle.endSnapshotId)!;
  assert.equal(recorder.record.result, 'death');
  assert.equal(snapshot.dice[0].faces[0].temporarySticker?.creature, 'chef');
  assert.equal(snapshot.combat.creatureState.storedFood[dice[0].id], 8);
  assert.equal(battle.rounds[0].takenHp, INITIAL_PLAYER_STATS.hp);
  assert.equal(battle.death?.beforeHit.hp, INITIAL_PLAYER_STATS.hp);
  state.dicePool[0].faces[0].baseValue++;
  assert.notEqual(snapshot.dice[0].faces[0].baseValue, state.dicePool[0].faces[0].baseValue);
});

test('round cap is a distinct defeat and last-round victory wins over timeout', () => {
  for (const victory of [false, true]) {
    const state = initial();
    const recorder = new RunRecorder('run', state, 0, 'test', true);
    const battle = startBattle(state);
    recorder.observe(battle, state, 1);
    const last = { ...roll(battle), creatureBattleState: { ...battle.creatureBattleState, round: BATTLE_LIMIT.rounds } };
    recorder.observe(last, battle, 2);
    recorder.observe({ ...last, combatPhase: victory ? 'VICTORY' : 'DEFEAT',
      currentEnemy: { ...last.currentEnemy!, hp: victory ? 0 : last.currentEnemy!.hp } }, last, 3);
    assert.equal(recorder.record.battles[0].outcome, victory ? 'victory' : 'round_limit');
  }
});

test('final boss produces separate region, chapter and current-content run milestones once', () => {
  const state = initial();
  state.currentNodeIndex = state.mapNodes.findIndex((node) => node.id === CHAPTER_END_NODE);
  const recorder = new RunRecorder('run', state, 0, 'test', true);
  const battle = startBattle(state);
  recorder.observe(battle, state, 1);
  const won: TelemetryState = { ...battle, combatPhase: 'VICTORY', currentEnemy: { ...battle.currentEnemy!, hp: 0 } };
  recorder.observe(won, battle, 2);
  recorder.observe({ ...won }, won, 3);
  assert.deepEqual(recorder.record.milestones.map((item) => item.kind), ['region', 'chapter', 'run']);
  assert.equal(recorder.record.result, 'victory');
});

test('equipment history preserves acquisition, replacement and active holding duration', () => {
  const state = initial();
  state.equipments = [];
  const recorder = new RunRecorder('run', state, 0, 'test', true);
  const first = { ...state, equipments: [ALL_EQUIPMENT_CATALOG[0]] };
  recorder.observe(first, state, 10);
  const second = { ...first, equipments: [ALL_EQUIPMENT_CATALOG[1]] };
  recorder.observe(second, first, 30);
  recorder.finish('abandoned', second, 50);
  const [old, current] = recorder.record.equipmentHistory;
  assert.equal(old.heldMs, 20);
  assert.equal(old.replacementId, ALL_EQUIPMENT_CATALOG[1].id);
  assert.equal(current.heldMs, 20);
  assert.equal(current.removedAt, null);
});

test('records settlement once, distinguishes impact damage from shield consumption and identifies retaliation', () => {
  let state = initial();
  const recorder = new RunRecorder('run', state, 0, 'test', true);
  const next = (value: TelemetryState, at: number) => { recorder.observe(value, state, at); state = value; };
  next(startBattle(state), 1);
  next(roll(state), 2);
  const summary = calculateRollResolution(state.dicePool, state.rolledIndices, state.equipments, state.creatureBattleState,
    { ...state, maxControl: INITIAL_PLAYER_STATS.maxControl });
  next({ ...state, comboSummary: summary, combatPhase: 'CONTROL_PHASE' }, 3);
  assert.equal(recorder.record.battles[0].rounds[0].settled, false);
  next({ ...state, combatPhase: 'RESOLVING_CALCULATION' }, 4);
  next({ ...state }, 5);
  assert.equal(recorder.record.battles[0].rounds[0].output, summary.totalDamage);
  assert.equal(recorder.record.battles[0].rounds[0].skills.length, summary.events.filter((event) => event.activated).length);
  const hp = state.currentEnemy!.hp;
  next({ ...state, currentEnemy: { ...state.currentEnemy!, hp: hp - 2 }, combatImpact: { kind: 'player' } }, 6);
  next({ ...state }, 7);
  next({ ...state, currentEnemy: { ...state.currentEnemy!, shield: 8 } }, 8);
  next({ ...state, currentEnemy: { ...state.currentEnemy!, shield: 0, hp } }, 9);
  const round = recorder.record.battles[0].rounds[0];
  assert.equal(round.damageHp, 2);
  assert.equal(round.damageShield, 0);
  next({ ...state, combatPhase: 'ENEMY_TURN', playerHp: 0, combatImpact: { kind: 'enemy', source: 'retaliation' } }, 10);
  assert.equal(recorder.record.battles[0].death?.source, DAMAGE_SOURCE_LABELS.retaliation);
});

test('equipment battle participation and snapshots remain stable after subsequent edits', () => {
  let state = initial();
  state.equipments = [ALL_EQUIPMENT_CATALOG[0]];
  const recorder = new RunRecorder('run', state, 0, 'test', true);
  const battle = startBattle(state);
  recorder.observe(battle, state, 1);
  assert.equal(recorder.record.equipmentHistory[0].battles, 1);
  state = { ...battle, dicePool: structuredClone(battle.dicePool) };
  state.dicePool.reverse();
  recorder.observe(state, battle, 2);
  assert.equal(recorder.record.snapshots.at(-1)!.dice[0].id, state.dicePool[0].id);
  assert.equal(recorder.record.snapshots[0].dice[0].id, INITIAL_DICE_POOL[0].id);
  state.equipments[0] = ALL_EQUIPMENT_CATALOG[1];
  assert.equal(recorder.record.snapshots[0].equipments[0].id, ALL_EQUIPMENT_CATALOG[0].id);
});
