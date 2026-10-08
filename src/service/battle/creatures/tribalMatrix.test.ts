import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_DICE_POOL } from '../../../configs/creatures/initialDiceConfig';
import { CREATURE_IDS } from '../../../configs/creatures/creatureConfig';
import { MONSTER_BALANCE_CONFIG } from '../../../configs/monsters/monsterBalanceConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../../configs/equipment/equipmentConfig';
import { D6_FACE_VALUES } from '../../../configs/creatures/diceValueConfig';
import type { PermanentCreatureId } from '../../../types/creatures';
import type { Dice } from '../../../types/game';
import { configuredDice } from '../../dice/diceFactory';
import { calculateRollResolution, predetermineRollResults } from '../battleEngine';
import { buildAttackPlan } from '../attackPlan';
import { createCreatureBattleState, combatNumber, startCreatureRound } from './creatureState';
import { resolveRerollChain } from './rerollResolution';

function build(size: number): Dice[] {
  const rows: PermanentCreatureId[][] = [
    ['sisters', 'sisters', 'gang', 'gang', 'gang', 'family'],
    ['boss', 'thief', 'coward', 'prankster', 'family', 'family'],
    ['chef', 'food', 'food', 'farmer', 'artisan', 'porter'],
    ['herald', 'bulwark', 'guard', 'warrior', 'follower', 'follower'],
    ['authority', 'elder', 'royalGuard', 'knight', 'imposter', 'priest'],
    ['porter', 'porter', 'teacher', 'twins', 'twins', 'glutton'],
  ];
  return Array.from({ length: size }, (_, index) => configuredDice(`matrix-${index}`, `矩陣 ${index}`, 'd6', 'amber',
    rows[index % rows.length].map((creature, faceIndex) => [creature, D6_FACE_VALUES[faceIndex]])));
}

test('every tribeling resolves across region dice counts, face densities and all pip positions', context => {
  let samples = 0;
  for (const [roleIndex, role] of CREATURE_IDS.entries()) {
    for (const size of Object.values(MONSTER_BALANCE_CONFIG.diceCountByRegion)) {
      for (const copies of [1, D6_FACE_VALUES.length / 2, D6_FACE_VALUES.length]) {
        const pool = Array.from({ length: size }, (_, index) => configuredDice(
          `roster-${index}`, role, 'd6', 'amber', D6_FACE_VALUES.map((pip, face) => [
            index === Math.floor(size / 2) && face < copies ? role
              : CREATURE_IDS[(roleIndex + index + face + 1) % CREATURE_IDS.length], pip,
          ]),
        ));
        const original = structuredClone(pool);
        for (const face of D6_FACE_VALUES.keys()) {
          const indices = pool.map(() => face);
          const state = createCreatureBattleState();
          const summary = calculateRollResolution(pool, indices, [], state);
          assert.deepEqual(summary, calculateRollResolution(pool, indices, [], state));
          for (const value of [summary.totalDamage, summary.totalShield, summary.healing,
            ...summary.items.map(item => item.finalDamage)]) {
            assert.ok(Number.isFinite(value) && value >= 0, `${role}/${size}/${copies}/${face}`);
          }
          assert.equal(combatNumber(buildAttackPlan(summary, 0, [])
            .reduce((sum, hit) => sum + hit.value, 0)), summary.totalDamage);
          samples++;
        }
        assert.deepEqual(pool, original);
      }
    }
  }
  context.diagnostic(`${CREATURE_IDS.length} tribelings, ${samples} deterministic roster samples using current balance config.`);
});

for (const size of [3, 6, 10]) test(`${size}-die seeded builds preserve finite rerolls, exact attack plans and event continuity`, (context) => {
  const pool = size === 3 ? structuredClone(INITIAL_DICE_POOL) : build(size);
  const gear = size === 3 ? [] : ALL_EQUIPMENT_CATALOG.filter((item) => ['RESONATOR', 'BARRICADE', 'CROWN', 'WARHAMMER', 'RESERVE'].includes(item.ruleId));
  let seed = 741;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
  const values: number[] = [];
  let maximumBonuses = 0;
  for (let sample = 0; sample < 500; sample++) {
    let state = createCreatureBattleState(seed);
    const first = predetermineRollResults(pool, random);
    const chain = resolveRerollChain(pool, first, state, sample % size, gear, random);
    assert.ok(chain.length <= size * 2 + 1);
    const last = chain.at(-1)!; state = last.state;
    const battle = { control: sample % 4, maxControl: 3, gold: 0, targetShield: 12 };
    const summary = calculateRollResolution(pool, last.rolledIndices, gear, state, battle);
    assert.deepEqual(summary, calculateRollResolution(pool, last.rolledIndices, gear, state, battle));
    const events = new Map(summary.items.map((item) => [`attack:${item.diceId}`, item.rolledBaseValue]));
    for (const event of summary.events) for (const change of event.changes) {
      const key = `${change.kind}:${change.targetId}`;
      assert.equal(change.before, events.get(key) ?? 0);
      assert.ok(Number.isFinite(change.after) && change.after >= 0);
      events.set(key, change.after);
    }
    for (const item of summary.items) assert.equal(events.get(`attack:${item.diceId}`), item.finalDamage);
    const plan = buildAttackPlan(summary, battle.targetShield, gear);
    assert.equal(combatNumber(plan.reduce((sum, hit) => sum + hit.value, 0)), summary.totalDamage);
    maximumBonuses = Math.max(maximumBonuses, summary.bonusDice.length);
    values.push(summary.totalDamage);
  }
  values.sort((a, b) => a - b);
  context.diagnostic(`${size} dice: ${values.length} samples, mean ${combatNumber(values.reduce((sum, n) => sum + n, 0) / values.length)}, p10/50/90 ${values[50]}/${values[250]}/${values[450]}, max bonuses ${maximumBonuses}`);
});

test('round rollover retains battle resources while reroll earnings and temporary identities reset', () => {
  const state = createCreatureBattleState();
  state.storedFood.a = 12; state.cowardShields.a = 4; state.altars.a = 6;
  state.teacherBonuses.a = 3; state.teachersAvailable = ['a']; state.prankstersUsed = ['a'];
  state.identitySnapshot.a = 'noble'; state.lockedDice = ['b'];
  state.initialRations = { a: 8 }; state.controlSpent = 2; state.formationUsed = true;
  const next = startCreatureRound(state, 19);
  assert.deepEqual(next, { ...createCreatureBattleState(), storedFood: { a: 12 }, altars: { a: 6 }, round: 1, roundSeed: 19, seed: 19 });
  next.storedFood.a = 1;
  assert.equal(state.storedFood.a, 12);
});
