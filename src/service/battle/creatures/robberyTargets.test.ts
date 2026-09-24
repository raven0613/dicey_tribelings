import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredDice } from '../../dice/diceFactory';
import { calculateRollResolution } from '../battleEngine';
import { performControlReroll } from '../rollService';
import { createCreatureBattleState, startCreatureRound } from './creatureState';
import { ALL_EQUIPMENT_CATALOG } from '../../../configs/equipment/equipmentConfig';
import { INITIAL_PLAYER_STATS } from '../../../configs/gameConfig';
import { createPermanentSticker } from '../../../configs/creatures/creatureStickerConfig';
import type { CreatureId } from '../../../types/creatures';

const base = createPermanentSticker('boss', 1).baseValue;
const die = (id: string, role: CreatureId, value = base) => configuredDice(id, id, 'd6', 'amber',
  Array.from({ length: 6 }, (_, index) => [index === 0 ? role : 'food', value]));
const target = (summary: ReturnType<typeof calculateRollResolution>, source = 'boss') => summary.events
  .find((event) => event.skill === 'boss' && event.sourceDiceId === source)?.changes
  .find((change) => change.kind === 'attack' && change.targetId !== source)?.targetId;

test('boss priorities survive unrelated seeds, candidate removal, restoration and reordering', () => {
  const pool = [die('boss', 'boss'), die('a', 'family'), die('b', 'family'), die('c', 'family')];
  const state = startCreatureRound(createCreatureBattleState(), 17);
  const resolve = (indices = pool.map(() => 0), round = state) => calculateRollResolution(pool, indices, [], round);
  const initial = target(resolve())!;
  const victim = pool.findIndex((entry) => entry.id === initial);
  const indices = pool.map((_, index) => Number(index === victim));
  const changed = { ...state, seed: state.seed + 1, faceVersions: { [initial]: 1 } };
  assert.notEqual(target(resolve(indices, changed)), initial);
  assert.equal(target(resolve(pool.map(() => 0), changed)), initial);
  assert.equal(target(resolve(pool.map(() => 0), { ...changed, seed: changed.seed + 1 })), initial);
  const reordered = [pool[0], ...pool.slice(1).reverse()];
  assert.equal(target(calculateRollResolution(reordered, reordered.map(() => 0), [], changed)), initial);
  assert.deepEqual(state.faceVersions, {});
});

test('boss rerolls and new rounds renew its choices while repeated previews are pure', () => {
  const pool = [die('boss', 'boss'), die('a', 'family'), die('b', 'family'), die('c', 'family')];
  const state = startCreatureRound(createCreatureBattleState(), 17);
  const operation = { dicePool: pool, rolledIndices: pool.map(() => 0), equipments: [], creatureBattleState: state,
    control: INITIAL_PLAYER_STATS.maxControl, maxControl: INITIAL_PLAYER_STATS.maxControl, gold: 0, combatPhase: 'CONTROL_PHASE' as const };
  const away = performControlReroll(0, operation, () => 0)!.steps.at(-1)!;
  const back = performControlReroll(0, { ...operation, rolledIndices: away.rolledIndices, creatureBattleState: away.state }, () => 0)!.steps.at(-1)!;
  assert.equal(back.state.faceVersions.boss, 2);
  assert.equal(back.state.roundSeed, state.roundSeed);
  const results = Array.from({ length: 32 }, (_, version) => calculateRollResolution(pool, operation.rolledIndices, [],
    { ...state, faceVersions: { boss: version } }));
  assert.ok(new Set(results.map((result) => target(result))).size > 1);
  const rounds = Array.from({ length: 32 }, (_, seed) => startCreatureRound(back.state, seed));
  assert.ok(rounds.every((round) => Object.keys(round.faceVersions).length === 0));
  assert.ok(new Set(rounds.map((round) => target(calculateRollResolution(pool, operation.rolledIndices, [], round)))).size > 1);
  assert.deepEqual(calculateRollResolution(pool, back.rolledIndices, [], back.state),
    calculateRollResolution(pool, back.rolledIndices, [], back.state));
});

test('reported five-boss build restores its attack chain after only bulwark is rerolled away and back', () => {
  // Player-reported regression fixture, not balance defaults.
  const entries: [CreatureId, number][] = [['boss', 11], ['boss', 8], ['boss', 14], ['elder', 7], ['boss', 5], ['boss', 11], ['bulwark', 16]];
  const pool = entries.map(([role, value], index) => die(`d${index}`, role, value));
  const equipments = ALL_EQUIPMENT_CATALOG.filter((item) => ['SLOTS', 'RESONATOR', 'BARRICADE', 'PIPE', 'ABACUS'].includes(item.ruleId));
  for (const seed of [46, 2027]) {
    const round = startCreatureRound(createCreatureBattleState(), seed);
    const initial = calculateRollResolution(pool, pool.map(() => 0), equipments, round);
    const operation = { dicePool: pool, rolledIndices: pool.map(() => 0), equipments, creatureBattleState: round,
      control: INITIAL_PLAYER_STATS.maxControl, maxControl: INITIAL_PLAYER_STATS.maxControl, gold: 0, combatPhase: 'CONTROL_PHASE' as const };
    const away = performControlReroll(pool.length - 1, operation, () => 0)!;
    const first = away.steps.at(-1)!;
    const back = performControlReroll(pool.length - 1, { ...operation, control: away.control,
      rolledIndices: first.rolledIndices, creatureBattleState: first.state }, () => 0)!.steps.at(-1)!;
    const restored = calculateRollResolution(pool, back.rolledIndices, equipments, back.state);
    assert.equal(restored.totalDamage, initial.totalDamage);
    assert.deepEqual(restored.items.map((item) => item.finalDamage), initial.items.map((item) => item.finalDamage));
    assert.deepEqual(restored.bonusDice, initial.bonusDice);
    assert.equal(restored.totalShield, initial.totalShield);
  }
});
