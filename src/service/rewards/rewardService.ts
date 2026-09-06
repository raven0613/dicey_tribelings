import {
  BattleRewardOption,
  ChestRewardOption,
  Equipment,
  RewardTier,
  StickerItem,
  StickerPack,
} from '../../types/game';
import { REWARD_CONFIG } from '../../configs/rewardConfig';

type RandomSource = () => number;

function takeRandom<T>(items: T[], random: RandomSource): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items.splice(index, 1)[0];
}

export function getRewardTier(nodeIndex: number, nodeCount: number): RewardTier {
  const progress = nodeCount > 0 ? nodeIndex / nodeCount : 0;
  if (progress < 1 / 3) return 'early';
  if (progress < 2 / 3) return 'mid';
  return 'late';
}

export function generateBattleRewardOptions(
  stickers: StickerItem[],
  packs: StickerPack[],
  tier: RewardTier,
  random: RandomSource = Math.random,
  allowStickerPack = true
): BattleRewardOption[] {
  const hasJackpot = allowStickerPack && packs.length > 0 && random() < REWARD_CONFIG.normalFightStickerPackChance;
  const tierPool = stickers.filter((sticker) => !sticker.isDisposable && sticker.creature !== 'princess' && sticker.rewardTier === tier);
  const fallbackPool = stickers.filter((sticker) => !sticker.isDisposable && sticker.creature !== 'princess');
  const available = [...(tierPool.length >= REWARD_CONFIG.normalFightOptionCount ? tierPool : fallbackPool)];
  const options: BattleRewardOption[] = [];

  while (options.length < REWARD_CONFIG.normalFightOptionCount && available.length > 0) {
    const sticker = takeRandom(available, random);
    if (sticker) options.push({ id: `sticker:${sticker.id}`, kind: 'sticker', sticker });
  }

  if (hasJackpot && options.length > 0) {
    const pack = packs[Math.min(packs.length - 1, Math.floor(random() * packs.length))];
    const replaceIndex = Math.min(options.length - 1, Math.floor(random() * options.length));
    options[replaceIndex] = { id: `pack:${pack.id}`, kind: 'stickerPack', pack };
  }

  return options;
}

export function generateChestRewardOptions(
  equipments: Equipment[],
  packs: StickerPack[],
  random: RandomSource = Math.random
): ChestRewardOption[] {
  const equipmentPool = [...equipments];
  const packPool = [...packs];
  const options: ChestRewardOption[] = [];
  const totalWeight = REWARD_CONFIG.chestEquipmentWeight + REWARD_CONFIG.chestStickerPackWeight;

  while (options.length < REWARD_CONFIG.chestOptionCount && (equipmentPool.length > 0 || packPool.length > 0)) {
    const wantsEquipment = random() * totalWeight < REWARD_CONFIG.chestEquipmentWeight;
    const equipment = wantsEquipment ? takeRandom(equipmentPool, random) : undefined;
    const pack = wantsEquipment ? undefined : takeRandom(packPool, random);
    const fallbackEquipment = equipment ?? (pack ? undefined : takeRandom(equipmentPool, random));
    const fallbackPack = pack ?? (fallbackEquipment ? undefined : takeRandom(packPool, random));

    if (fallbackEquipment) {
      options.push({ id: `equipment:${fallbackEquipment.id}`, kind: 'equipment', equipment: fallbackEquipment });
    } else if (fallbackPack) {
      options.push({ id: `pack:${fallbackPack.id}`, kind: 'stickerPack', pack: fallbackPack });
    }
  }

  return options;
}
