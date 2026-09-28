import { COMBAT_GOLD } from '../battleConfig';
import { REWARD_CONFIG as rewards } from '../rewardConfig';

const advancedStickers = `永久貼紙 ${rewards.advancedOptionCount} 選 ${rewards.advancedPickCount}`;
export const MAP_PRESENTATION = {
  labels: { reward: '獎勵', features: '特點', completed: '已完成', skipped: '已放棄', choose: '選擇' },
  rewards: {
    fight: `貼紙／貼紙包 ${rewards.normalFightOptionCount} 選 ${rewards.normalFightPickCount}、${COMBAT_GOLD.normal} 金幣`,
    elite: `${advancedStickers}、${COMBAT_GOLD.elite} 金幣`,
    boss: `配方骰三選一、${advancedStickers}、${COMBAT_GOLD.boss} 金幣`,
    finalBoss: `配方骰三選一、${advancedStickers}、完成鱷魚人篇`,
    chest: `裝備 ${rewards.chestOptionCount} 選 1`,
    camp: '免費回血／付費回滿／單場祝福三選一，祝福可付費刷新',
    shop: '永久／臨時貼紙、裝備、治療、付費刷新',
  },
} as const;
