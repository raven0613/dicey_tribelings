import type { Equipment } from '../../types/game';

export const EQUIPMENT_BALANCE = {
  formationCost: 1, whistleCost: 1, whistleBonus: 2, pipeControl: 1, pipeRefund: 1,
  prismCost: 2, abacusTags: 3, abacusControl: 1, controlHeadroom: 2,
  shieldRetention: 0.5, barricadeShield: 3, bonusDamage: 2, goldThresholds: [50, 100], paidRerollMultiplier: 0.6,
  stolenGoldMin: 3, stolenGoldMax: 5, shieldDamageMultiplier: 1.2,
  matchedMultiplier: 2, frugalMultiplier: 1.1, reserveDamage: 2,
} as const;

const equipment = (id: string, name: string, ruleId: string, type: Equipment['type'],
  rarity: Equipment['rarity'], iconName: string, description: string): Equipment =>
  ({ id, name, ruleId, type, rarity, iconName, description });
const b = EQUIPMENT_BALANCE;
export const ALL_EQUIPMENT_CATALOG: Equipment[] = [
  equipment('eq_formation', '土人隊形旗', 'FORMATION', 'control', 'common', 'Layers', `每回合花 ${b.formationCost} Control 交換一對鄰骰一次。`),
  equipment('eq_whistle', '代理王子哨子', 'WHISTLE', 'control', 'rare', 'Shield', `每回合花 ${b.whistleCost} Control 保護一骰免受強制重骰，攻擊力 +${b.whistleBonus}。`),
  equipment('eq_pipe', '長老煙斗', 'PIPE', 'control', 'common', 'RotateCcw', `起始 Control +${b.pipeControl}；花費 Control 重骰後，基礎攻擊力持平或下降，返還 ${b.pipeRefund} Control，每回合一次。`),
  equipment('eq_prism', '強力探照燈透鏡', 'PRISM', 'control', 'rare', 'Sparkles', `花 ${b.prismCost} Control 翻至幾何相對面，適用具有相對面的骰型。`),
  equipment('eq_abacus', '土人算盤', 'ABACUS', 'control', 'rare', 'Layers', `場上有 ${b.abacusTags} 種土人標籤時，回合結束獲得 ${b.abacusControl} Control，上限為起始值 +${b.controlHeadroom}。`),
  equipment('eq_shield_wrap', '鱷皮護盾套', 'SHIELD_RETENTION', 'global', 'rare', 'Shield', `下回合保留 ${b.shieldRetention * 100}% 剩餘護盾。`),
  equipment('eq_barricade', '巨骨護身壁', 'BARRICADE', 'global', 'rare', 'Shield', `每回合獲得 ${b.barricadeShield} 額外護盾。`),
  equipment('eq_resonator', '戰鼓共鳴箱', 'RESONATOR', 'global', 'rare', 'Zap', `所有追加攻擊骰的傷害 +${b.bonusDamage}。`),
  equipment('eq_rations', '備用乾糧袋', 'RATIONS', 'global', 'rare', 'Backpack', '勝利時帶走實體食物值。下場首回合視為一份食物，平均分給含廚師面的骰子存糧。'),
  equipment('eq_crown', '王子的備用皇冠', 'CROWN', 'global', 'legendary', 'Sparkles', '每回合將基礎攻擊力最高的普通土人，其普通標籤暫時替換為貴族。'),
  equipment('eq_piggy', '王子的存錢筒', 'PIGGY', 'control', 'common', 'Layers', `開戰時金幣超過 ${b.goldThresholds.join(" 與 ")}，各增加 1 點起始 Control。`),
  equipment('eq_counterweight', '黃金秤錘', 'COUNTERWEIGHT', 'control', 'rare', 'RotateCcw', `付費重骰享 ${b.paidRerollMultiplier * 10} 折。`),
  equipment('eq_purse', '鱷魚皮錢袋', 'PURSE', 'global', 'rare', 'Layers', `本回合成功搶奪時，獲得 ${b.stolenGoldMin}～${b.stolenGoldMax} 金幣一次。`),
  equipment('eq_warhammer', '土人大錘', 'WARHAMMER', 'global', 'rare', 'ShieldAlert', `每次撞擊前敵人有盾時，該次傷害 ×${b.shieldDamageMultiplier}。`),
  equipment('eq_slots', '老虎機', 'SLOTS', 'pattern', 'rare', 'Layers', `場上出現最多次的基礎攻擊力取得重擊，基礎攻擊力 ×${b.matchedMultiplier}；平手隨機選一個值。`),
  equipment('eq_frugal', '沉著徽章', 'FRUGAL', 'global', 'rare', 'Shield', `本回合未消耗 Control 且未付費重骰，全隊傷害 ×${b.frugalMultiplier}。`),
  equipment('eq_reserve', '蓄勢徽章', 'RESERVE', 'global', 'rare', 'Sparkles', `每剩餘 1 Control，最終攻擊最高的一顆正常骰 +${b.reserveDamage}；平手取最左側。`),
];
export const INITIAL_EQUIPMENT: Equipment[] = [];
export const hasEquipment = (items: Equipment[], rule: string) => items.some((item) => item.ruleId === rule);
