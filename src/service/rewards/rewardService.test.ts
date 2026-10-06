import assert from 'node:assert/strict';
import test from 'node:test';
import { generateBattleRewardOptions, generateChestRewardOptions, getBattleRewardCount, getBattleRewardStickers } from './rewardService';
import { createPermanentSticker } from '../../configs/creatures/creatureStickerConfig';
import { CREATURE_CONFIG, CREATURE_IDS } from '../../configs/creatures/creatureConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../configs/equipment/equipmentConfig';
import { REWARD_CONFIG } from '../../configs/rewardConfig';
import { MATERIAL_CHANCES } from '../../configs/materials/materialConfig';
import { NORMAL_REWARD_CREATURES, RELATED_POOLS } from '../../configs/creatures/rewardPoolsConfig';

test('every rank offers three distinct rewards and one whole reward choice', () => {
  for (const rank of ['normal', 'elite', 'boss', 'final_boss'] as const) {
    const options = generateBattleRewardOptions(rank, () => 0.5);
    assert.equal(options.length, rank === 'normal' ? REWARD_CONFIG.normalFightOptionCount : REWARD_CONFIG.advancedOptionCount);
    assert.equal(getBattleRewardCount(rank), 1);
    assert.equal(new Set(options.map(item => item.id)).size, options.length);
    for (const option of options) {
      if (rank === 'normal') {
        assert.equal(option.kind, 'bundle');
        assert.ok(option.kind === 'bundle');
        assert.notEqual(option.sticker.creature, 'princess');
        assert.equal(option.hidden.length, REWARD_CONFIG.normalHiddenStickerCount);
        assert.equal(getBattleRewardStickers(option).length, 1 + REWARD_CONFIG.normalHiddenStickerCount);
      } else {
        assert.equal(option.kind, 'pack');
        assert.ok(option.kind === 'pack');
        assert.equal(option.stickers.length, REWARD_CONFIG.packStickerCount);
      }
      assert.ok(getBattleRewardStickers(option).every(item => item.isDisposable === false && !('baseValue' in item)));
    }
  }
});

test('sticker species determine rarity while the receiving face owns the pip', () => {
  for (const creature of CREATURE_IDS) {
    const sticker = createPermanentSticker(creature);
    assert.equal(sticker.rarity, CREATURE_CONFIG[creature].rarity);
    assert.equal('baseValue' in sticker, false);
    assert.equal('region' in sticker, false);
  }
});

test('normal hidden stickers use distinct related roles, the configured branch boundary and rarity weights', () => {
  assert.deepEqual(Object.keys(RELATED_POOLS).sort(), [...NORMAL_REWARD_CREATURES].sort());
  const weight = (role: keyof typeof RELATED_POOLS) => REWARD_CONFIG.creatureWeights[CREATURE_CONFIG[role].rarity];
  for (const front of NORMAL_REWARD_CREATURES) {
    const related = RELATED_POOLS[front]!;
    assert.equal(new Set(related).size, related.length);
    assert.ok(related.every(role => role !== 'princess'));
    const excluded = NORMAL_REWARD_CREATURES.filter(role => role !== front).map(role => `permanent:${role}`);
    for (const [branch, pool] of [
      [REWARD_CONFIG.relatedChance - Number.EPSILON, related],
      [REWARD_CONFIG.relatedChance, NORMAL_REWARD_CREATURES],
    ] as const) {
      const totalWeight = pool.map(weight).reduce((sum, value) => sum + value, 0);
      let accumulated = 0;
      for (const role of pool) {
        const rolls = [0, branch, (accumulated + weight(role) / 2) / totalWeight];
        const [option] = generateBattleRewardOptions('normal', () => rolls.shift() ?? 0, excluded, 1);
        assert.ok(option.kind === 'bundle');
        assert.equal(option.sticker.creature, front);
        assert.equal(option.hidden.length, REWARD_CONFIG.normalHiddenStickerCount);
        assert.equal(option.hidden[0].creature, role, `${front}: branch ${branch} must reach ${role}`);
        accumulated += weight(role);
      }
    }
  }
});

test('material allocation coats at most one sticker in each complete bundle', () => {
  for (const roll of [0, MATERIAL_CHANCES.ordinary, MATERIAL_CHANCES.ordinary + MATERIAL_CHANCES.special]) {
    for (const rank of ['normal', 'elite'] as const) for (const option of generateBattleRewardOptions(rank, () => roll)) {
      const coated = getBattleRewardStickers(option).filter(sticker => sticker.material);
      assert.equal(coated.length, roll < MATERIAL_CHANCES.ordinary ? 0 : 1);
    }
  }
});

test('chests offer three distinct equipment choices', () => {
  const options = generateChestRewardOptions(ALL_EQUIPMENT_CATALOG, () => 0.99);
  assert.equal(options.length, REWARD_CONFIG.chestOptionCount);
  assert.equal(new Set(options.map(item => item.id)).size, options.length);
});
