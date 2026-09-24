import assert from 'node:assert/strict';
import test from 'node:test';
import { DAMAGE_POP_PRESENTATION as config } from '../../../configs/numberFeedbackConfig';
import { appendDamagePop, findDamagePopSlot } from './damagePops';
import type { PopSlot } from './damagePops';
import type { DamagePop } from '../../../types/game';

test('each hit retains its attack value and its own lifetime without displacing earlier pops', () => {
  let pops: DamagePop[] = [];
  const count = 12;
  const interval = config.lifetimeMs / (count * 2);
  for (let id = 0; id < count; id++) pops = appendDamagePop(pops, { value: 120 }, id, id * interval);
  assert.equal(pops.length, count);
  assert.ok(pops.every((pop) => pop.value === 120));
  assert.equal(pops[0].startedAt, 0);
  pops = appendDamagePop(pops, { value: 30 }, count, config.lifetimeMs);
  assert.equal(pops.some((pop) => pop.id === 0), false);
  assert.equal(pops.some((pop) => pop.id === 1), true);
});

test('successive measured float footprints use distinct slots within viewport bounds', () => {
  const viewport = { width: 800, height: 600 };
  const anchor = { x: 400, y: 130 };
  const slots: PopSlot[] = [];
  for (const size of [{ width: 90, height: 90 }, { width: 50, height: 65 }, { width: 140, height: 110 }, { width: 80, height: 80 }]) {
    const placed = findDamagePopSlot(size, anchor, viewport, slots);
    assert.ok(placed.x >= config.edgeMargin && placed.y >= config.edgeMargin);
    assert.ok(placed.x + placed.width <= viewport.width - config.edgeMargin);
    assert.ok(placed.y + placed.height <= viewport.height - config.edgeMargin);
    for (const old of slots) assert.ok(placed.x + placed.width + config.slotGap <= old.x
      || old.x + old.width + config.slotGap <= placed.x
      || placed.y + placed.height + config.slotGap <= old.y
      || old.y + old.height + config.slotGap <= placed.y);
    slots.push(placed);
  }
});

test('edge anchors and a dense narrow viewport retain existing slots and choose bounded new ones', () => {
  const viewport = { width: 320, height: 400 };
  const size = { width: 120, height: 100 };
  const slots: PopSlot[] = [];
  for (let index = 0; index < 15; index++) {
    const before = structuredClone(slots);
    const slot = findDamagePopSlot(size, { x: viewport.width, y: 0 }, viewport, slots);
    assert.ok(slot.x >= config.edgeMargin && slot.y >= config.edgeMargin);
    assert.ok(slot.x + slot.width <= viewport.width - config.edgeMargin);
    assert.ok(slot.y + slot.height <= viewport.height - config.edgeMargin);
    assert.deepEqual(slots, before);
    slots.push(slot);
  }
});
