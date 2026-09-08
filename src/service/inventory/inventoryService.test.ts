import { getEffectiveFace } from '../dice/diceFaces';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyPermanentSticker,
  applyTemporaryPlacements,
  createConsumableSticker,
  removeConsumables,
  replaceConsumable,
  restoreTemporaryStickers,
} from './inventoryService';
import { Dice, PermanentSticker, DisposableSticker } from '../../types/game';

const permanentSticker: PermanentSticker = {
  id: 'permanent-boss',
  name: '孩子王貼紙',
  isDisposable: false,
  baseValue: 12,
  creature: 'boss',
  description: '孩子王12',
  rarity: 'rare',
  region: 5,
};

const disposableSticker: DisposableSticker = {
  id: 'disposable-boss',
  name: '戰術孩子王',
  isDisposable: true,
  creature: 'boss',
  description: '本場孩子王',
  rarity: 'rare',
};

const dicePool: Dice[] = [
  {
    id: 'die-1',
    name: '測試骰',
    dieType: 'd4',
    colorTheme: 'ruby',
    faces: [
      { id: 'face-1', baseValue: 1, creature: 'food' },
      { id: 'face-2', baseValue: 2, creature: 'food' },
      { id: 'face-3', baseValue: 3, creature: 'food' },
      { id: 'face-4', baseValue: 4, creature: 'food' },
    ],
  },
];

test('creates independent consumable instances for stickers with the same catalog id', () => {
  const first = createConsumableSticker(disposableSticker, 'instance-1');
  const second = createConsumableSticker(disposableSticker, 'instance-2');

  assert.equal(first.stickerId, second.stickerId);
  assert.notEqual(first.instanceId, second.instanceId);
});

test('replaces exactly one consumable instance', () => {
  const current = [
    createConsumableSticker(disposableSticker, 'instance-1'),
    createConsumableSticker(disposableSticker, 'instance-2'),
    createConsumableSticker({ ...disposableSticker, id: 'elephporter' }, 'instance-3'),
  ];
  const incoming = createConsumableSticker({ ...disposableSticker, id: 'follower' }, 'incoming');

  const result = replaceConsumable(current, 'instance-2', incoming);

  assert.deepEqual(result.map((item) => item.instanceId), ['instance-1', 'incoming', 'instance-3']);
});

test('removes only consumables committed to battle preparation', () => {
  const current = [
    createConsumableSticker(disposableSticker, 'instance-1'),
    createConsumableSticker(disposableSticker, 'instance-2'),
  ];

  const result = removeConsumables(current, ['instance-1']);

  assert.deepEqual(result.map((item) => item.instanceId), ['instance-2']);
});

test('temporary placements override faces for the battle and restore the permanent values afterward', () => {
  const consumable = createConsumableSticker(disposableSticker, 'instance-1');
  const prepared = applyTemporaryPlacements(dicePool, [
    { consumable, diceId: 'die-1', faceIndex: 0 },
  ]);

  assert.equal(prepared[0].faces[0].baseValue, 1);
  assert.equal(getEffectiveFace(prepared[0].faces[0]).baseValue, 1);
  assert.equal(getEffectiveFace(prepared[0].faces[0]).creature, 'boss');
  assert.deepEqual(restoreTemporaryStickers(prepared), dicePool);
  assert.equal(restoreTemporaryStickers(prepared)[0].faces[0].temporarySticker, undefined);
});

test('permanent stickers replace base face data without retaining a temporary sticker', () => {
  const result = applyPermanentSticker(dicePool, 'die-1', 1, permanentSticker);

  assert.equal(result[0].faces[1].baseValue, 12);
  assert.equal(result[0].faces[1].creature, 'boss');
  assert.equal(result[0].faces[1].temporarySticker, undefined);
});
