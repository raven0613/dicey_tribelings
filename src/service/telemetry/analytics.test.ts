import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DICE_POOL } from '../../configs/gameConfig';
import { TELEMETRY_CONFIG } from '../../configs/telemetryConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { compositionOf, rerollSummary, expiredRunIds } from './analytics';

test('composition counts physical faces across unequal dice and ignores temporary roles', () => {
  const dice = structuredClone(INITIAL_DICE_POOL).slice(0, 2);
  dice[1].faces = dice[1].faces.slice(0, 2);
  const role = dice[0].faces[0].creature;
  dice[0].faces[0].temporarySticker = { name: CREATURE_CONFIG.teacher.name, creature: 'teacher', description: '' };
  const rows = compositionOf(dice);
  const total = dice.flatMap((die) => die.faces).length;
  const count = dice.flatMap((die) => die.faces).filter((face) => face.creature === role).length;
  assert.equal(rows.find((row) => row.creatureId === role)?.percent, count / total * 100);
  assert.equal(rows.reduce((sum, row) => sum + row.faces, 0), total);
  assert.ok(rows.every((row) => row.totalFaces === total && row.name === CREATURE_CONFIG[row.creatureId].name));
  assert.deepEqual(compositionOf([]), []);
});

test('reroll average includes victories and defeats but excludes unfinished battles', () => {
  const battles = [{ rerolls: 4, outcome: 'victory' }, { rerolls: 2, outcome: 'death' }, { rerolls: 9, outcome: 'incomplete' }] as const;
  assert.deepEqual(rerollSummary(battles), { total: 15, average: 3, completed: 2 });
  assert.deepEqual(rerollSummary([]), { total: 0, average: 0, completed: 0 });
});

test('retention removes oldest complete records down to configured capacity', () => {
  const runs = Array.from({ length: TELEMETRY_CONFIG.maxRuns + 2 }, (_, index) => ({ id: `run-${index}`, startedAt: index }));
  assert.deepEqual(expiredRunIds(runs.reverse()), ['run-0', 'run-1']);
  assert.deepEqual(expiredRunIds(runs.slice(0, TELEMETRY_CONFIG.maxRuns)), []);
});
