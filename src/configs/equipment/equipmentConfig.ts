import type { Equipment } from '../../types/game';

export const EQUIPMENT_BALANCE = {
  bodyComboStep: 0.25, lowBonusThreshold: 2, lowBonusDamage: 1, firstBonusDamage: 1,
  foodRebate: 0.2, lineMinimum: 3, coronationCount: 2, coronationDamage: 1,
  controlShield: 2, rerollMemory: 0.5, splitParts: 3, chargeLimit: 3,
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
  equipment('eq_formation', '土人隊形旗', 'FORMATION', 'control', 'common', 'Layers', `花 ${b.formationCost} Control 交換一對相鄰骰子的位置；一回合一次。`),
  equipment('eq_whistle', '代理王子哨子', 'WHISTLE', 'control', 'rare', 'Shield', `花 ${b.whistleCost} Control 保護一顆骰子免受強制重骰，攻擊力 +${b.whistleBonus}；一回合一次。`),
  equipment('eq_pipe', '長老煙斗', 'PIPE', 'control', 'common', 'RotateCcw', `起始 Control +${b.pipeControl}；花費 Control 重骰後，若基礎攻擊力持平或下降，返還 ${b.pipeRefund} Control，每回合一次。`),
  equipment('eq_prism', '強力探照燈', 'PRISM', 'control', 'rare', 'Sparkles', `花 ${b.prismCost} Control 翻至幾何相對面。`),
  equipment('eq_abacus', '土人算盤', 'ABACUS', 'control', 'rare', 'Layers', `場上有 ${b.abacusTags} 種不同土人標籤時，回合結束獲得 ${b.abacusControl} Control，上限為起始值 +${b.controlHeadroom}。`),
  equipment('eq_shield_wrap', '鱷魚保護殼', 'SHIELD_RETENTION', 'global', 'rare', 'Shield', `下回合保留 ${b.shieldRetention * 100}% 剩餘護盾。`),
  equipment('eq_barricade', '土人護符', 'BARRICADE', 'global', 'rare', 'Shield', `每回合獲得 ${b.barricadeShield} 護盾。`),
  equipment('eq_resonator', '戰鼓共鳴箱', 'RESONATOR', 'global', 'rare', 'Zap', `所有追加攻擊骰的傷害 +${b.bonusDamage}。`),
  equipment('eq_rations', '備用乾糧袋', 'RATIONS', 'global', 'rare', 'Backpack', '戰鬥勝利時保留未用完的存糧。下場戰鬥開始時，平均分給所有含土人廚師的骰子作為初始存糧。'),
  equipment('eq_crown', '王子的備用皇冠', 'CROWN', 'global', 'legendary', 'Sparkles', '每回合將基礎攻擊力最高的 [普通] 土人，其普通標籤暫時替換為 [貴族]。'),
  equipment('eq_piggy', '小公主撲滿', 'PIGGY', 'control', 'common', 'Layers', `戰鬥開始時金幣若超過 ${b.goldThresholds.join(" 與 ")}，各增加 1 點起始 Control。`),
  equipment('eq_counterweight', '黃金秤錘', 'COUNTERWEIGHT', 'control', 'rare', 'RotateCcw', `付費重骰享 ${b.paidRerollMultiplier * 10} 折優惠。`),
  equipment('eq_purse', '鱷皮錢袋', 'PURSE', 'global', 'rare', 'Layers', `本回合每次成功搶奪時，獲得 ${b.stolenGoldMin}～${b.stolenGoldMax} 金幣。`),
  equipment('eq_warhammer', '土人大錘', 'WARHAMMER', 'global', 'rare', 'ShieldAlert', `每次攻擊前敵人有盾時，該次傷害 ×${b.shieldDamageMultiplier}。`),
  equipment('eq_slots', '老虎機', 'SLOTS', 'pattern', 'rare', 'Layers', `基礎攻擊力出現最多次的正常骰，額外取得自身基礎攻擊力的 ${b.matchedMultiplier - 1} 倍加成；平手隨機選一個值。`),
  equipment('eq_frugal', '木製手銬', 'FRUGAL', 'global', 'rare', 'Shield', `本回合未主動重骰，全隊傷害 ×${b.frugalMultiplier}。`),
  equipment('eq_reserve', '蓄威拳套', 'RESERVE', 'global', 'rare', 'Sparkles', `每剩餘 1 Control，最終攻擊最高的一顆正常骰的攻擊力 +${b.reserveDamage}；平手取最左側。`),
  equipment('eq_body_combo', '狂暴蘑菇汁', 'BODY_COMBO', 'global', 'rare', 'Zap', `每顆骰子每回合從第 2 次普通攻擊起，每次傷害各自遞增 ${b.bodyComboStep * 100}%。`),
  equipment('eq_low_split', '碎石彈弓', 'LOW_SPLIT', 'global', 'rare', 'Layers', `原始傷害 ≤${b.lowBonusThreshold} 的追加攻擊，各額外產生一次 ${b.lowBonusDamage} 傷害的追加攻擊。`),
  equipment('eq_idle_bonus', '腹語娃娃', 'IDLE_BONUS', 'global', 'rare', 'Zap', '每名結算後攻擊力為 0 的土人，以其基礎攻擊力產生一次追加攻擊。'),
  equipment('eq_food_rebate', '破洞湯勺', 'FOOD_REBATE', 'global', 'rare', 'Backpack', `每次釋放存糧後，將消耗量的 ${b.foodRebate * 100}% 返還為該骰存糧。`),
  equipment('eq_line_product', '排隊口哨', 'LINE_PRODUCT', 'pattern', 'rare', 'Layers', `同名土人至少 ${b.lineMinimum} 名相鄰，且基礎攻擊力依序遞增或遞減時，以連線中各土人基礎攻擊力的相乘值，發動 1 次追加攻擊。`),
  equipment('eq_coronation', '冊封禮炮', 'CORONATION', 'global', 'rare', 'Sparkles', `初擲後每次身份標籤變化，發動 ${b.coronationCount} 次 ${b.coronationDamage} 傷害的追加攻擊。`),
  equipment('eq_first_bonus', '泡泡槍', 'FIRST_BONUS', 'global', 'rare', 'Layers', `本場戰鬥的首次追加攻擊，每顆再產生一次 ${b.firstBonusDamage} 傷害的追加攻擊。`),
  equipment('eq_control_shield', '厚皮手套', 'CONTROL_SHIELD', 'global', 'rare', 'Shield', `每消耗 1 Control，獲得 ${b.controlShield} 點護盾。`),
  equipment('eq_absorb', '捕夢網', 'ABSORB', 'control', 'rare', 'Zap', '指定一顆骰子吸入全員追加攻擊的傷害；每回合一次。'),
  equipment('eq_reroll_drop', '玩具槌', 'REROLL_DROP', 'global', 'rare', 'RotateCcw', '每次主動重骰後，若基礎攻擊力低於原骰面，以其差值追加攻擊 1 次。'),
  equipment('eq_reroll_memory', '小公主蠟筆', 'REROLL_MEMORY', 'global', 'rare', 'RotateCcw', `每回合首次重骰時，新面取得原面基礎攻擊力 ${b.rerollMemory * 100}% 的數值，該骰再次改面時失效。`),
  equipment('eq_split', '土製炸彈', 'SPLIT', 'control', 'rare', 'Layers', `選擇一名攻擊力最高的土人，將其攻擊力均分為 ${b.splitParts} 次追加攻擊，隨後攻擊力歸 0；一回合一次。`),
  equipment('eq_patient', '土人集點卡', 'PATIENT', 'global', 'rare', 'Shield', `每一回合未重骰的骰子累積一點，下回合起每層使其攻擊力 +1，最多 ${b.chargeLimit} 點。重骰後該骰點數清空。`),
];
export const INITIAL_EQUIPMENT: Equipment[] = [];
export const hasEquipment = (items: Equipment[], rule: string) => items.some((item) => item.ruleId === rule);
