import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_MAP_NODES } from '../../configs/regions/mapConfig';
import { completeRouteNode, selectRouteNode } from './routeService';

test('所有普通／菁英與跨區營火分岔匯合相同、不能走回另一條路', () => {
  for (const fork of INITIAL_MAP_NODES.filter(node => node.next.length === 2)) {
    assert.ok(fork);
    const [left, right] = fork.next.map((id) => INITIAL_MAP_NODES.find((node) => node.id === id)!);
    assert.deepEqual(left.next, right.next);
    const completed = completeRouteNode(INITIAL_MAP_NODES, fork.id);
    const selected = selectRouteNode(completed, fork.next, left.id)!;
    assert.ok(selected.find((node) => node.id === right.id)!.skipped);
    assert.equal(selectRouteNode(selected, [], right.id), null);
  }
});
