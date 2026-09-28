import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_MAP_NODES } from '../../../configs/regions/mapConfig';
import { MONSTER_CONFIG } from '../../../configs/monsters/monsterConfig';
import { getEnemiesForNode } from '../nodeService';
import { chapterPath } from '../../regions/routeService';
import { describeEnemyIntent } from './enemyDescription';
import { resolveEnemyIntent } from './enemyIntent';

test('both three-region routes visit twenty nodes and fourteen encounters with shared shops and bosses', () => {
  for (const route of ['safe', 'challenge'] as const) {
    const path = chapterPath(INITIAL_MAP_NODES, route);
    assert.equal(path.length, 20); assert.equal(path.filter(node => node.enemyIds).length, 14);
    assert.equal(path.filter(node => node.type === 'shop').length, 3);
    assert.equal(path.filter(node => node.type === 'boss').length, 3);
    for (const node of path.filter(node => node.enemyIds)) {
      const enemies = getEnemiesForNode(node);
      assert.equal(new Set(enemies.map(enemy => enemy.id)).size, enemies.length);
      for (const enemy of enemies) {
        assert.equal(enemy.region, node.region);
        assert.ok(MONSTER_CONFIG.some(config => config.id === enemy.definitionId));
        assert.ok(describeEnemyIntent(enemy).length);
        assert.ok(resolveEnemyIntent(enemy).damage >= 0);
      }
    }
  }
  const twins = MONSTER_CONFIG.filter(enemy => ['r2_first', 'r2_second'].includes(enemy.id));
  assert.equal(twins.length, 2); assert.ok(twins.every(enemy => enemy.region === 2));
});
