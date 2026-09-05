import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateBattleRewardOptions,
  generateChestRewardOptions,
  getRewardTier,
} from './rewardService';
import { Equipment, StickerItem, StickerPack } from '../../types/game';
import { REWARD_CONFIG } from '../../configs/rewardConfig';

const stickers: StickerItem[] = [
  { id: 'early-1', name: '早期1', isDisposable: false, baseValue: 4, element: 'normal', description: '', rarity: 'common', rewardTier: 'early' },
  { id: 'early-2', name: '早期2', isDisposable: false, baseValue: 6, element: 'fire', description: '', rarity: 'common', rewardTier: 'early' },
  { id: 'early-3', name: '早期3', isDisposable: false, baseValue: 8, element: 'wind', description: '', rarity: 'rare', rewardTier: 'early' },
  { id: 'mid-1', name: '中期1', isDisposable: false, baseValue: 10, element: 'thunder', description: '', rarity: 'rare', rewardTier: 'mid' },
];

const packs: StickerPack[] = [
  { id: 'pack-1', name: '貼紙包1', rarity: 'rare', description: '', stickerCount: 3, themeName: '測試', stickerIds: [] },
  { id: 'pack-2', name: '貼紙包2', rarity: 'legendary', description: '', stickerCount: 4, themeName: '測試', stickerIds: [] },
];

const equipments: Equipment[] = [
  { id: 'equipment-1', name: '裝備1', type: 'global', rarity: 'common', description: '', iconName: 'Sparkles', ruleId: 'ONE' },
  { id: 'equipment-2', name: '裝備2', type: 'global', rarity: 'rare', description: '', iconName: 'Sparkles', ruleId: 'TWO' },
  { id: 'equipment-3', name: '裝備3', type: 'control', rarity: 'rare', description: '', iconName: 'Sparkles', ruleId: 'THREE' },
];

function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

test('keeps reward probabilities in config at the agreed values', () => {
  assert.equal(REWARD_CONFIG.normalFightStickerPackChance, 0.05);
  assert.equal(REWARD_CONFIG.chestEquipmentWeight, 0.65);
  assert.equal(REWARD_CONFIG.chestStickerPackWeight, 0.35);
});

test('maps run progress into early, mid and late reward tiers', () => {
  assert.equal(getRewardTier(0, 9), 'early');
  assert.equal(getRewardTier(3, 9), 'mid');
  assert.equal(getRewardTier(6, 9), 'late');
});

test('generates three permanent sticker choices from the current tier', () => {
  const options = generateBattleRewardOptions(stickers, packs, 'early', () => 0.9);

  assert.equal(options.length, 3);
  assert.ok(options.every((option) => option.kind === 'sticker'));
  assert.ok(options.every((option) => option.kind !== 'sticker' || option.sticker.rewardTier === 'early'));
});

test('replaces one normal reward choice with a sticker pack at the configured jackpot chance', () => {
  const options = generateBattleRewardOptions(
    stickers,
    packs,
    'early',
    sequenceRandom([0.01, 0, 0, 0, 0, 0])
  );

  assert.equal(options.filter((option) => option.kind === 'stickerPack').length, 1);
});

test('draws each chest slot by equipment and sticker pack weights without duplicate choices', () => {
  const options = generateChestRewardOptions(
    equipments,
    packs,
    sequenceRandom([0.1, 0, 0.9, 0, 0.1, 0])
  );

  assert.deepEqual(options.map((option) => option.kind), ['equipment', 'stickerPack', 'equipment']);
  assert.equal(new Set(options.map((option) => option.id)).size, 3);
});
