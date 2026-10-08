import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_DICE_POOL } from '../../configs/creatures/initialDiceConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../configs/equipment/equipmentConfig';
import { packReferences, unpackReferences } from './references';

test('repeated configurations share definitions and restore the complete JSON without aliases', () => {
  const snapshot = { dice: INITIAL_DICE_POOL, equipments: ALL_EQUIPMENT_CATALOG.slice(0, 1) };
  const value = {
    runs: [{ snapshots: Array.from({ length: 10 }, (_, id) => ({ id, ...snapshot })) }],
  };
  const packed = packReferences(value);
  const expected = JSON.parse(JSON.stringify(value));
  const restored = unpackReferences(packed);
  assert.deepEqual(restored, expected);
  assert.ok(JSON.stringify(packed).length < JSON.stringify(value).length);
  assert.equal(Object.keys(packed.records).filter((id) => id.startsWith('equipment:')).length, 1);
  assert.notEqual(
    (restored as typeof expected).runs[0].snapshots[0].dice,
    (restored as typeof expected).runs[0].snapshots[1].dice,
  );
});

test('definitions with identical game IDs but different historical values remain distinct', () => {
  const equipment = ALL_EQUIPMENT_CATALOG[0];
  const value = [
    { equipments: [equipment] },
    { equipments: [{ ...equipment, description: 'historical description' }] },
  ];
  const packed = packReferences(value);
  assert.equal(Object.keys(packed.records).filter((id) => id.startsWith('equipment:')).length, 2);
  assert.deepEqual(unpackReferences(packed), JSON.parse(JSON.stringify(value)));
});
