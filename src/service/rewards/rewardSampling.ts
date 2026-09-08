import type { EquipmentRarity } from '../../types/game';
import { REWARD_CONFIG } from '../../configs/rewardConfig';

/** 依角色稀有度權重抽取，從候選中移除，維持同批品項各異。 */
export function takeWeighted<T extends { rarity: EquipmentRarity }>(available: T[], random: () => number): T | undefined {
  const total = available.reduce((sum, item) => sum + REWARD_CONFIG.creatureWeights[item.rarity], 0);
  if (total === 0) return undefined;
  let choice = random() * total;
  for (let index = 0; index < available.length; index++) {
    choice -= REWARD_CONFIG.creatureWeights[available[index].rarity];
    if (choice < 0) return available.splice(index, 1)[0];
  }
  return undefined;
}
