import { MATERIAL_CHANCES } from '../../configs/materials/materialConfig';
import assert from 'node:assert/strict';
import test from 'node:test';
import { generateBattleRewardOptions, generateChestRewardOptions, getBattleRewardCount } from './rewardService';
import { createPermanentSticker } from '../../configs/creatures/creatureStickerConfig';
import { CREATURE_CONFIG, CREATURE_IDS } from '../../configs/creatures/creatureConfig';
import { REGION_CONFIG, REGION_IDS } from '../../configs/regions/regionConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../configs/equipment/equipmentConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';

test('each region supplies distinct permanent choices and elite/boss provide two picks from five', () => {
  for (const region of REGION_IDS) for (const rank of ['normal', 'elite', 'boss'] as const) {
    const options = generateBattleRewardOptions(region, rank, () => 0.5);
    assert.equal(options.length, rank === 'normal' ? 3 : 5);
    assert.equal(getBattleRewardCount(rank), rank === 'normal' ? 1 : 2);
    assert.equal(new Set(options.map((item) => item.id)).size, options.length);
    for (const option of options) {
      assert.equal(option.kind, 'sticker');
      if (option.kind === 'sticker' && option.sticker.isDisposable === false) {
        assert.equal(option.sticker.region, region);
        assert.notEqual(option.sticker.creature, 'princess');
      }
    }
  }
  assert.deepEqual(generateBattleRewardOptions(6, 'final_boss'), []);
  assert.equal(getBattleRewardCount('final_boss'), 0);
});

test('regional quality changes base value while species rarity remains fixed', () => {
  for (const creature of CREATURE_IDS) {
    const first = createPermanentSticker(creature, 1), last = createPermanentSticker(creature, 6);
    assert.equal(first.rarity, CREATURE_CONFIG[creature].rarity);
    assert.equal(first.rarity, last.rarity);
    assert.equal(last.baseValue - first.baseValue, creature === 'princess' ? 0
      : REGION_CONFIG[6].stickerBonus - REGION_CONFIG[1].stickerBonus);
  }
});

test('jackpot substitutes one normal choice and advanced rewards remain permanent', () => {
  assert.equal(generateBattleRewardOptions(1, 'normal', () => 0).filter((item) => item.kind === 'stickerPack').length, 1);
  for (const rank of ['elite', 'boss'] as const)
    assert.ok(generateBattleRewardOptions(1, rank, () => 0).every((item) => item.kind === 'sticker'));
});

test('chests guarantee an equipment candidate even when random draws favor packs', () => {
  const options = generateChestRewardOptions(ALL_EQUIPMENT_CATALOG, STICKER_PACKS_CATALOG, () => 0.99);
  assert.equal(options[0].kind, 'equipment');
  assert.equal(options.length, 3);
  assert.equal(new Set(options.map((item) => item.id)).size, 3);
});

test('material tier is drawn first once per reward screen, independently of role rarity and jackpot', () => {
  const ordinaryEnd = MATERIAL_CHANCES.ordinary;
  const specialEnd = ordinaryEnd + MATERIAL_CHANCES.special;
  const rolls = [0, ordinaryEnd - 0.00001, ordinaryEnd, specialEnd - 0.00001, specialEnd, 0.99999];
  for (const rank of ['normal', 'elite', 'boss'] as const) for (const roll of rolls) {
    let count = 0;
    const options = generateBattleRewardOptions(1, rank, () => count++ === 0 ? roll : 0.5);
    const coated = options.flatMap((o) => o.kind === 'sticker' && o.sticker.isDisposable === false && o.sticker.material ? [o.sticker.material] : []);
    assert.equal(coated.length, roll < ordinaryEnd ? 0 : 1);
    if (coated.length) assert.equal(['echo', 'iridescent'].includes(coated[0]), roll >= specialEnd);
  }
});
