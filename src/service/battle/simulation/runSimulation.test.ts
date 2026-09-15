import { chapterPath } from '../../regions/routeService';
import { REGION_IDS } from '../../../configs/regions/regionConfig';
import { INITIAL_DICE_POOL } from '../../../configs/gameConfig';
import { BATTLE_LIMIT } from '../../../configs/battleConfig';
import assert from 'node:assert/strict';
import test from 'node:test';
import { simulateRun } from './runSimulation';
import { RUN_SIMULATION_CONFIG as config } from '../../../configs/regions/runSimulationConfig';
import { INITIAL_MAP_NODES, CHAPTER_END_NODE } from '../../../configs/regions/mapConfig';
import { INITIAL_PLAYER_STATS } from '../../../configs/gameConfig';
import { PROGRESSION_DICE_REWARDS } from '../../../configs/diceProgressionConfig';
import { getBattleRewardCount } from '../../rewards/rewardService';

// 策略門檻是「存在可通關的合法成長路線」，玩家通關率由實機驗證。
test('real rewards, finite HP, Control and shops produce repeatable completed crocodile chapters', (context) => {
  const runs = Array.from({ length: config.runs }, (_, index) => simulateRun(config.seed + index));
  assert.deepEqual(runs[0], simulateRun(config.seed));
  assert.ok(runs.some((run) => run.chapterCompleted), 'the seeded policies must include a reachable complete run');
  for (const run of runs) {
    assert.ok(run.hp >= 0 && run.hp <= INITIAL_PLAYER_STATS.maxHp);
    assert.ok(run.gold >= 0 && Number.isFinite(run.gold));
    assert.ok(run.checkpoints.every((row) => Number.isFinite(row.damage) && row.damage > 0));
    assert.ok(run.encounters.every((row) => row.turns > 0 && row.turns <= BATTLE_LIMIT.rounds));
    if (run.chapterCompleted) {
      assert.equal(run.lastNode, CHAPTER_END_NODE);
      assert.equal(run.encounters.length, chapterPath(INITIAL_MAP_NODES, 'challenge').filter((node) => node.enemyId).length);
      assert.equal(run.diceCount, INITIAL_DICE_POOL.length + Object.keys(PROGRESSION_DICE_REWARDS).length);
    }
  }
  const ordinary = Array.from({ length: config.runs }, (_, index) => simulateRun(config.seed + index, true, true, 'safe'));
  assert.ok(ordinary.some((run) => run.chapterCompleted), 'common reward choices must retain a viable route');
  context.diagnostic(`${runs.length + ordinary.length} seeded runs: all rewards/challenge ${runs.filter((run) => run.chapterCompleted).length}/${runs.length}, common rewards/safe ${ordinary.filter((run) => run.chapterCompleted).length}/${ordinary.length}; milestone dice and equipment remain available in both policies.`);
});

test('each route has equal length and shared growth while elites offer greater rewards', () => {
  const safe = chapterPath(INITIAL_MAP_NODES, 'safe');
  const challenge = chapterPath(INITIAL_MAP_NODES, 'challenge');
  assert.equal(safe.length, challenge.length);
  assert.equal(INITIAL_MAP_NODES.length - safe.length, REGION_IDS.length);
  for (const id of Object.keys(PROGRESSION_DICE_REWARDS).map(Number)) {
    assert.ok(safe.some((node) => node.id === id));
    assert.ok(challenge.some((node) => node.id === id));
  }
  assert.ok(getBattleRewardCount('elite') > getBattleRewardCount('normal'));
});
