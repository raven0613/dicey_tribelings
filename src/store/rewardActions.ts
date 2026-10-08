import { recordDecision } from '../service/telemetry/commit';
import { createOwnedSticker } from '../service/inventory/stickerInstances';
import { REWARD_CONFIG } from '../configs/rewardConfig';
import { ALL_EQUIPMENT_CATALOG, INITIAL_PLAYER_STATS } from '../configs/gameConfig';
import {
  getBattleRewardStickers,
  getSkipRewardGold,
  generateChestRewardOptions,
} from '../service/rewards/rewardService';
import { openStickerPack } from '../service/stickers/packService';
import { soundService } from '../service/audio/soundService';
import type { GameState, FlowCompletion } from './gameStore.types';
import type { StickerItem } from '../types/game';

export function createRewardActions(
  set: (patch: Partial<GameState>) => void,
  get: () => GameState,
  startStickerFlow: (items: StickerItem[], completion: FlowCompletion) => void,
) {
  return {
    beginExtraReward: () => {
      const state = get();
      const reward = get().extraReward;
      if (!reward || get().receivedRewardDice || get().diceRewardOptions.length) return;
      set({ extraReward: null });
      startStickerFlow([reward], 'stay');
      recordDecision(set, state, get(), {
        kind: 'acquire',
        source: 'reward',
        label: '額外戰利品',
        items: get().stickerFlow!.items,
      });
    },

    openPackAction: (packId, completion) => {
      const state = get();
      const result = openStickerPack(packId, Math.random, get().princessPackCount);
      set({
        princessPackCount:
          get().princessPackCount +
          result.stickers.filter((item) => item.creature === 'princess').length,
      });
      soundService.playVictory();
      set({
        openedPackResult: {
          ...result,
          stickers: result.stickers.map(createOwnedSticker),
          completion,
        },
      });
      recordDecision(set, state, get(), {
        kind: 'pack',
        source: 'shop',
        choiceId: packId,
        items: get().openedPackResult!.stickers,
      });
    },

    beginOpenedPack: () => {
      const result = get().openedPackResult;
      if (!result) return;
      set({ openedPackResult: null });
      startStickerFlow(result.stickers, result.completion);
    },

    claimBattleReward: (id) => {
      const state = get(),
        option = state.battleRewardOptions.find((item) => item.id === id);
      if (
        !option ||
        state.combatPhase !== 'VICTORY' ||
        state.receivedRewardDice ||
        state.diceRewardOptions.length ||
        state.extraReward ||
        state.stickerFlow ||
        !state.battleRewardPickCount
      )
        return;
      const items = getBattleRewardStickers(option);
      set({
        battleRewardOptions: [],
        battleRewardPickCount: 0,
        princessPackCount:
          state.princessPackCount + items.filter((item) => item.creature === 'princess').length,
        stickerFlow: {
          items: items.map(createOwnedSticker),
          index: -1,
          completion: 'advance',
          rewardGold: getSkipRewardGold(state.enemies[0].rank),
          usedAny: false,
        },
      });
      recordDecision(set, state, get(), {
        kind: 'reward',
        source: 'reward',
        choiceId: id,
        items: get().stickerFlow!.items,
      });
      soundService.playVictory();
    },
    skipBattleReward: () => {
      const state = get();
      if (
        state.combatPhase !== 'VICTORY' ||
        !state.battleRewardOptions.length ||
        state.receivedRewardDice ||
        state.diceRewardOptions.length ||
        state.extraReward ||
        state.stickerFlow ||
        !state.battleRewardPickCount
      )
        return;
      set({
        battleRewardOptions: [],
        battleRewardPickCount: 0,
        gold: state.gold + getSkipRewardGold(state.enemies[0].rank),
      });
      recordDecision(set, state, get(), { kind: 'skip', source: 'reward' });
      get().advanceToNextNode();
    },

    openChest: () => {
      const ownedIds = new Set(get().equipments.map((equipment) => equipment.id));
      const equipmentPool = ALL_EQUIPMENT_CATALOG.filter(
        (equipment) => !ownedIds.has(equipment.id),
      );
      set({ chestRewardOptions: generateChestRewardOptions(equipmentPool) });
      soundService.playCoin();
    },

    claimChestReward: (option) => {
      const state = get();
      if (!get().chestRewardOptions.some((item) => item.id === option.id)) return;
      if (get().equipments.length < INITIAL_PLAYER_STATS.maxEquipmentSlots) {
        const slotIndex = get().equipments.length;
        set({
          chestRewardOptions: [],
          equipments: [...get().equipments, option.equipment],
          equipmentSlotFeedback: { slotIndex },
        });
        recordDecision(set, state, get(), {
          kind: 'equip',
          source: 'chest',
          choiceId: option.id,
          items: [option.equipment],
        });
        soundService.playVictory();
        soundService.playEquip();
        get().advanceToNextNode();
        return;
      }
      set({ pendingEquipment: { equipment: option.equipment, source: 'chest', cost: 0 } });
    },

    skipChestReward: () => {
      const state = get();
      const { mapNodes, currentNodeIndex, chestRewardOptions } = get();
      const node = mapNodes[currentNodeIndex];
      if (node?.type !== 'chest' || node.completed || chestRewardOptions.length === 0) return;
      set({
        chestRewardOptions: [],
        pendingEquipment: null,
        gold: get().gold + REWARD_CONFIG.skipGold.equipment,
      });
      recordDecision(set, state, get(), { kind: 'skip', source: 'chest' });
      get().advanceToNextNode();
    },
  } satisfies Pick<
    GameState,
    | 'beginExtraReward'
    | 'openPackAction'
    | 'beginOpenedPack'
    | 'claimBattleReward'
    | 'skipBattleReward'
    | 'openChest'
    | 'claimChestReward'
    | 'skipChestReward'
  >;
}
