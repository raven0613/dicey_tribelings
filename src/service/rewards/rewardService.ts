import type { BattleRewardOption, ChestRewardOption, Equipment, PermanentSticker, StickerPack } from '../../types/game';
import type { RegionId, EnemyRank } from '../../types/enemy';
import { ALL_STICKERS_CATALOG } from '../../configs/creatures/creatureStickerConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';
import { REWARD_CONFIG } from '../../configs/rewardConfig';
import { takeWeighted } from './rewardSampling';

function takeRandom<T>(items: T[], random: () => number): T | undefined {
  return items.length ? items.splice(Math.floor(random() * items.length), 1)[0] : undefined;
}
export function getBattleRewardCount(rank: EnemyRank): number {
  return rank === 'final_boss' ? 0 : rank === 'normal' ? REWARD_CONFIG.normalFightPickCount : REWARD_CONFIG.advancedPickCount;
}
export function generateBattleRewardOptions(region: RegionId, rank: EnemyRank,
  random: () => number = Math.random): BattleRewardOption[] {
  if (rank === 'final_boss') return [];
  const count = rank === 'normal' ? REWARD_CONFIG.normalFightOptionCount : REWARD_CONFIG.advancedOptionCount;
  const available = ALL_STICKERS_CATALOG.filter((item): item is PermanentSticker =>
    item.isDisposable === false && item.region === region && item.creature !== 'princess');
  const options: BattleRewardOption[] = [];
  while (options.length < count) {
    const sticker = takeWeighted(available, random);
    if (!sticker) break;
    options.push({ id: `sticker:${sticker.id}`, kind: 'sticker', sticker });
  }
  if (rank === 'normal' && random() < REWARD_CONFIG.normalFightStickerPackChance) {
    const pack = STICKER_PACKS_CATALOG[Math.floor(random() * STICKER_PACKS_CATALOG.length)];
    options[Math.floor(random() * options.length)] = { id: `pack:${pack.id}`, kind: 'stickerPack', pack };
  }
  return options;
}
export function generateChestRewardOptions(equipments: Equipment[], packs: StickerPack[],
  random: () => number = Math.random): ChestRewardOption[] {
  const equipmentPool = [...equipments], packPool = [...packs];
  const options: ChestRewardOption[] = [];
  const totalWeight = REWARD_CONFIG.chestEquipmentWeight + REWARD_CONFIG.chestStickerPackWeight;
  while (options.length < REWARD_CONFIG.chestOptionCount && (equipmentPool.length || packPool.length)) {
    const wantsEquipment = options.length === 0 || random() * totalWeight < REWARD_CONFIG.chestEquipmentWeight;
    const equipment = wantsEquipment ? takeRandom(equipmentPool, random) : undefined;
    const pack = equipment ? undefined : takeRandom(packPool, random);
    const selectedEquipment = equipment ?? (pack ? undefined : takeRandom(equipmentPool, random));
    if (selectedEquipment) options.push({ id: `equipment:${selectedEquipment.id}`, kind: 'equipment', equipment: selectedEquipment });
    else if (pack) options.push({ id: `pack:${pack.id}`, kind: 'stickerPack', pack });
  }
  return options;
}
