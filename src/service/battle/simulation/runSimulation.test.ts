import assert from 'node:assert/strict';
import test from 'node:test';
import { simulateRun } from './runSimulation';
import { RUN_SIMULATION_CONFIG as config } from '../../../configs/regions/runSimulationConfig';
import { INITIAL_MAP_NODES } from '../../../configs/regions/mapConfig';
import { INITIAL_PLAYER_STATS } from '../../../configs/gameConfig';
import { PROGRESSION_DICE_REWARDS } from '../../../configs/diceProgressionConfig';
import { getBattleRewardCount } from '../../rewards/rewardService';

// 策略門檻是「存在可通關的合法成長路線」，玩家通關率由實機驗證。
test('real rewards, finite HP, Control and shops produce repeatable complete rescue runs', (context) => {
  const runs = Array.from({ length: config.runs }, (_, index) => simulateRun(config.seed + index));
  assert.deepEqual(runs[0], simulateRun(config.seed));
  assert.ok(runs.some((run) => run.won), 'the seeded policies must include a reachable complete run');
  for (const run of runs) {
    assert.ok(run.hp >= 0 && run.hp <= INITIAL_PLAYER_STATS.maxHp);
    assert.ok(run.gold >= 0 && Number.isFinite(run.gold));
    assert.ok(run.checkpoints.every((row) => Number.isFinite(row.damage) && row.damage > 0));
    assert.ok(run.encounters.every((row) => row.turns > 0 && row.turns <= config.maxBattleTurns));
    if (run.won) {
      assert.equal(run.lastNode, INITIAL_MAP_NODES.length - 1);
      assert.equal(run.encounters.length, 28);
      assert.equal(run.diceCount, 7);
    }
  }
  const ordinary = Array.from({ length: config.runs }, (_, index) => simulateRun(config.seed + index, true));
  assert.ok(ordinary.some((run) => run.won), 'common reward choices must retain a viable route');
  context.diagnostic(`48 seeded runs: all rewards ${runs.filter((run) => run.won).length}/${runs.length}, common rewards ${ordinary.filter((run) => run.won).length}/${ordinary.length}; milestone dice and equipment remain available in both policies.`);
});

test('regional route and milestone rewards fulfill the documented finite growth budget', () => {
  assert.equal(INITIAL_MAP_NODES.length, 40);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((region) => INITIAL_MAP_NODES.filter((node) => node.region === region).length), [7, 7, 7, 7, 7, 5]);
  assert.equal(Object.keys(PROGRESSION_DICE_REWARDS).length, 4);
  const rewards = INITIAL_MAP_NODES.reduce((sum, node) => sum + (node.type === 'fight' ? getBattleRewardCount('normal')
    : node.type === 'elite' ? getBattleRewardCount('elite') : node.type === 'boss' && node.region < 6 ? getBattleRewardCount('boss') : 0), 0);
  assert.equal(rewards, 38); // 另加深牢補給包的兩張；小公主為額外里程碑。
});
