import { evaluateBuild } from './buildPolicy';
import { fixedDice } from '../../dice/diceFactory';
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
import { REWARD_CONFIG } from '../../../configs/rewardConfig';
import { generateBattleRewardOptions, getBattleRewardStickers } from '../../rewards/rewardService';

// 策略門檻是「存在可通關的合法成長路線」，玩家通關率由實機驗證。
for (const entry of ['combat', 'camp'] as const) test(`${entry} entry routes with real rewards and finite resources can complete the chapter`, (context) => {
  const runs = Array.from({ length: config.runs }, (_, index) => simulateRun(config.seed + index, false, true, 'challenge', entry));
  assert.deepEqual(runs[0], simulateRun(config.seed, false, true, 'challenge', entry));
  assert.ok(runs.some((run) => run.chapterCompleted), 'the seeded policies must include a reachable complete run');
  for (const run of runs) {
    assert.ok(run.hp >= 0 && run.hp <= INITIAL_PLAYER_STATS.maxHp);
    assert.ok(run.gold >= 0 && Number.isFinite(run.gold));
    assert.ok(run.checkpoints.every((row) => Number.isFinite(row.damage) && row.damage > 0));
    assert.ok(run.encounters.every((row) => row.turns > 0 && row.turns <= BATTLE_LIMIT.rounds));
    if (run.chapterCompleted) {
      assert.equal(run.lastNode, CHAPTER_END_NODE);
      assert.equal(run.encounters.length, chapterPath(INITIAL_MAP_NODES, 'challenge', entry).filter((node) => node.enemyIds).length);
      assert.equal(run.diceCount, INITIAL_DICE_POOL.length + REGION_IDS.length);
    }
  }
  const ordinary = Array.from({ length: config.runs }, (_, index) => simulateRun(config.seed + index, true, true, 'safe', entry));
  assert.ok(ordinary.some((run) => run.chapterCompleted), 'common reward choices must retain a viable route');
  context.diagnostic(`${entry}: ${runs.length + ordinary.length} seeded runs: all rewards/challenge ${runs.filter((run) => run.chapterCompleted).length}/${runs.length}, common rewards/safe ${ordinary.filter((run) => run.chapterCompleted).length}/${ordinary.length}; Boss blank dice and equipment remain available in both policies.`);
});

test('each route has equal length and shared growth while elites offer themed packs', () => {
  const safe = chapterPath(INITIAL_MAP_NODES, 'safe');
  const challenge = chapterPath(INITIAL_MAP_NODES, 'challenge');
  assert.equal(safe.length, challenge.length);
  assert.equal(INITIAL_MAP_NODES.length - safe.length, INITIAL_MAP_NODES.filter(node => node.next.length > 1).length);
  const camp = chapterPath(INITIAL_MAP_NODES, 'safe', 'camp');
  assert.equal(camp.length, safe.length);
  assert.equal(camp.filter(node => node.enemyIds).length, safe.filter(node => node.enemyIds).length - camp.filter(node => node.type === 'camp').length);
  for (const id of INITIAL_MAP_NODES.filter(node => node.type === 'boss').map(node => node.id)) {
    assert.ok(safe.some((node) => node.id === id));
    assert.ok(challenge.some((node) => node.id === id));
  }
  const elite = generateBattleRewardOptions('elite', () => 0.5)[0];
  const normal = generateBattleRewardOptions('normal', () => 0.5)[0];
  assert.equal(elite.kind, 'pack');
  assert.equal(normal.kind, 'bundle');
  assert.equal(getBattleRewardStickers(elite).length, REWARD_CONFIG.packStickerCount);
  assert.equal(getBattleRewardStickers(normal).length, 1 + REWARD_CONFIG.normalHiddenStickerCount);
  assert.ok(getBattleRewardStickers(elite).length > getBattleRewardStickers(normal).length);
});

test('build evaluation values stored food released in later rounds and preserves its inputs', () => {
  const cook = fixedDice('cook', 'cook', 'amber', { 1: 'chef', 2: 'chef', 3: 'chef', 4: 'food', 5: 'food', 6: 'food' });
  const plain = { ...cook, faces: cook.faces.map(face => ({ ...face, creature: 'blank' as const })) };
  const before = structuredClone(cook);
  assert.ok(evaluateBuild([cook], [], config.seed).damage > evaluateBuild([plain], [], config.seed).damage);
  assert.deepEqual(cook, before);
  assert.deepEqual(evaluateBuild([cook], [], config.seed), evaluateBuild([cook], [], config.seed));
});
