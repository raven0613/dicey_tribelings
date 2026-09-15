import { COMBAT_GOLD } from '../battleConfig';
import { REWARD_CONFIG as rewards } from '../rewardConfig';
import { FINAL_STICKER_PACK } from '../stickerPacksConfig';

const advancedStickers = `永久貼紙 ${rewards.advancedOptionCount} 選 ${rewards.advancedPickCount}`;
export const MAP_PRESENTATION = {
  labels: { reward: '獎勵', features: '特點', completed: '已完成', skipped: '已放棄', choose: '選擇' },
  rewards: {
    fight: `貼紙／貼紙包 ${rewards.normalFightOptionCount} 選 ${rewards.normalFightPickCount}、${COMBAT_GOLD.normal} 金幣`,
    elite: `${advancedStickers}、${COMBAT_GOLD.elite} 金幣`,
    boss: `${advancedStickers}、${COMBAT_GOLD.boss} 金幣、恢復 ${rewards.bossHeal} HP`,
    finalBoss: `完成鱷魚人篇、${COMBAT_GOLD.boss} 金幣`,
    chest: `裝備／貼紙包 ${rewards.chestOptionCount} 選 1`,
    shop: '購買治療、裝備、臨時貼紙',
    pack: `永久貼紙 ×${FINAL_STICKER_PACK.permanentCount}`,
  },
} as const;
