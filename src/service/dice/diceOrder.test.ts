import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_DICE_POOL } from '../../configs/creatures/initialDiceConfig';
import { canReorderDice, reorderDice } from './diceOrder';

test('whole-die insertion preserves identity, faces and attached data', () => {
  const pool = structuredClone(INITIAL_DICE_POOL);
  const result = reorderDice(pool, pool[0].id, pool.length - 1);
  assert.deepEqual(result.map((die) => die.id), [...pool.slice(1), pool[0]].map((die) => die.id));
  assert.equal(result.at(-1), pool[0]);
  assert.equal(result.at(-1)!.faces, pool[0].faces);
  assert.deepEqual(reorderDice(result, pool[0].id, 0), pool);
  assert.equal(reorderDice(pool, pool[0].id, 0), pool);
});

test('free reorder is available before the first roll and after victory, locked throughout battle', () => {
  assert.equal(canReorderDice('PREPARATION', true), true);
  assert.equal(canReorderDice('VICTORY', true), true);
  for (const phase of ['ROLLING', 'CONTROL_PHASE', 'RESOLVING_CALCULATION', 'RESOLVING_ATTACK', 'ENEMY_TURN', 'DEFEAT'] as const) assert.equal(canReorderDice(phase, true), false);
});

test('noncombat nodes permit free ordering even when they share the control phase', () => {
  assert.equal(canReorderDice('CONTROL_PHASE', false), true);
});
