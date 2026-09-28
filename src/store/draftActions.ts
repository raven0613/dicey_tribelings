import type { GameState } from './gameStore.types';
import { drawDiceRecipes, instantiateRecipe } from '../service/dice/diceDraft';
import { generateBattleRewardOptions } from '../service/rewards/rewardService';
import { getRefreshCost, rewardKey } from '../service/rewards/refreshService';
import { generateShopStock } from '../service/shop/shopStock';
export function createDraftActions(set: (value: Partial<GameState>) => void, get: () => GameState) {
  return {
    chooseRewardDice: (recipeId: string) => {
      const state = get(), recipe = state.diceRewardOptions.find(item => item.id === recipeId);
      if (!recipe || state.combatPhase !== 'VICTORY') return;
      set({ dicePool: [...state.dicePool, instantiateRecipe(recipe, state.mapNodes[state.currentNodeIndex].region)], diceRewardOptions: [] });
    },
    refreshDiceReward: () => {
      const state = get(), cost = getRefreshCost('dice', state.diceRefreshes);
      if (!state.diceRewardOptions.length || state.gold < cost) return;
      set({ gold: state.gold - cost, diceRefreshes: state.diceRefreshes + 1,
        diceRewardOptions: drawDiceRecipes(state.diceRewardOptions.map(item => item.id)) });
    },
    refreshBattleRewards: () => {
      const state = get(), cost = getRefreshCost('loot', state.lootRefreshes);
      if (state.combatPhase !== 'VICTORY' || state.diceRewardOptions.length || state.extraReward || state.stickerFlow
        || !state.battleRewardPickCount || state.gold < cost) return;
      const enemy = state.enemies[0];
      set({ gold: state.gold - cost, lootRefreshes: state.lootRefreshes + 1,
        battleRewardOptions: generateBattleRewardOptions(enemy.region, enemy.rank, Math.random,
          state.battleRewardOptions.map(rewardKey), state.battleRewardOptions.length) });
    },
    refreshShop: () => {
      const state = get(), cost = getRefreshCost('shop', state.shopRefreshes), node = state.mapNodes[state.currentNodeIndex];
      if (node.type !== 'shop' || node.completed || state.stickerFlow || state.pendingEquipment || state.pendingShopSticker || state.gold < cost) return;
      set({ gold: state.gold - cost, shopRefreshes: state.shopRefreshes + 1,
        ...generateShopStock(state.equipments, node.region, Math.random, state) });
    },
  };
}
