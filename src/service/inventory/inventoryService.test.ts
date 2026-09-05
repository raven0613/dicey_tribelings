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
import { Dice, StickerItem } from '../../types/game';

const permanentSticker: StickerItem = {
  id: 'permanent-fire',
  name: '火焰貼紙',
  isDisposable: false,
  baseValue: 12,
  element: 'fire',
  description: '火12',
  rarity: 'rare',
  rewardTier: 'late',
};

const disposableSticker: StickerItem = {
  id: 'disposable-fire',
  name: '戰術火焰',
  isDisposable: true,
  baseValue: 15,
  element: 'fire',
  description: '本場火15',
  rarity: 'rare',
};

const dicePool: Dice[] = [
  {
    id: 'die-1',
    name: '測試骰',
    dieType: 'd4',
    colorTheme: 'ruby',
    faces: [
      { id: 'face-1', baseValue: 1, element: 'normal' },
      { id: 'face-2', baseValue: 2, element: 'normal' },
      { id: 'face-3', baseValue: 3, element: 'normal' },
      { id: 'face-4', baseValue: 4, element: 'normal' },
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
    createConsumableSticker({ ...disposableSticker, id: 'ice' }, 'instance-3'),
  ];
  const incoming = createConsumableSticker({ ...disposableSticker, id: 'wind' }, 'incoming');

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
  assert.equal(prepared[0].faces[0].temporarySticker?.baseValue, 15);
  assert.equal(restoreTemporaryStickers(prepared)[0].faces[0].temporarySticker, undefined);
});

test('permanent stickers replace base face data without retaining a temporary sticker', () => {
  const result = applyPermanentSticker(dicePool, 'die-1', 1, permanentSticker);

  assert.equal(result[0].faces[1].baseValue, 12);
  assert.equal(result[0].faces[1].element, 'fire');
  assert.equal(result[0].faces[1].temporarySticker, undefined);
});
