import { COMBAT_GOLD } from '../battleConfig';

const advancedStickers = `貼紙`;
export const MAP_PRESENTATION = {
  labels: { reward: '獎勵', features: '特點', completed: '已完成', skipped: '已放棄', choose: '選擇' },
  rewards: {
    fight: `貼紙、${COMBAT_GOLD.normal} 金幣`,
    elite: `${advancedStickers}、${COMBAT_GOLD.elite} 金幣`,
    boss: `骰子、${advancedStickers}、${COMBAT_GOLD.boss} 金幣`,
    finalBoss: `骰子、${advancedStickers}、完成鱷魚人篇`,
    chest: `裝備`,
    camp: '治療、祝福',
    shop: '貼紙、裝備、治療',
  },
} as const;
