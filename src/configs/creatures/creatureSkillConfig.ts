import { ARROW_DESCRIPTION } from '../directionalStickerConfig';
import type { CreatureId } from '../../types/creatures';
import type { SkillInputs } from '../../types/battle';
import { CREATURE_BALANCE as b } from './creatureBalanceConfig';

export interface SkillStage { text: string; achieved: (input: SkillInputs) => boolean }
const range = (min: number, max: number, text: string, field: 'count' | 'value' = 'count'): SkillStage => ({
  text, achieved: (input) => (input[field] ?? 0) >= min && (input[field] ?? 0) <= max,
});
const upper = Infinity;
export const CREATURE_SKILL_STAGES: Partial<Record<CreatureId, SkillStage[]>> = {
  family: b.family.multipliers.slice(1).map((multiplier, i) => range(i + 2, i === b.family.multipliers.length - 2 ? upper : i + 2, `${i + 2} 面：基礎攻擊力 ×${multiplier}`)),
  sisters: [range(b.sisters.minimum, b.sisters.middle - 1, `${b.sisters.minimum} 名：各 ×${b.sisters.multiplier}`), range(b.sisters.middle, b.sisters.repeatAt - 1, `${b.sisters.middle} 名：各 ×${b.sisters.highMultiplier}`), range(b.sisters.repeatAt, upper, `${b.sisters.repeatAt} 名以上：各 ×${b.sisters.highMultiplier}，再攻擊一次`)],
  twins: [range(b.twins.halfAt, b.twins.fullAt - 1, `${b.twins.halfAt}～${b.twins.fullAt - 1} 面：以 ${b.twins.half * 100}% 攻擊再打一次`), range(b.twins.fullAt, b.twins.doubleAt - 1, `${b.twins.fullAt}～${b.twins.doubleAt - 1} 面：再攻擊一次`), range(b.twins.doubleAt, upper, `${b.twins.doubleAt} 面：再攻擊兩次`)],
  gang: [range(1, b.gang.middle - 1, `1～${b.gang.middle - 1} 鄰面：每面一顆 ${b.gang.damagePerNeighbor} 點追加骰`), range(b.gang.middle, b.gang.doubleAt - 1, `${b.gang.middle} 鄰面：每面一顆 ${b.gang.highDamage} 點追加骰`), range(b.gang.doubleAt, upper, `${b.gang.doubleAt} 鄰面以上：每面 ${b.gang.copies} 顆 ${b.gang.highDamage} 點追加骰`)],
  boss: b.boss.multipliers.map((multiplier, i) => range(i + 1, i === b.boss.multipliers.length - 1 ? upper : i + 1, `第 ${i + 1} 次${i === b.boss.multipliers.length - 1 ? '起' : ''}搶奪：取得對方攻擊 ×${multiplier}`)),
  chef: [range(0, b.chef.retainAt - 0.01, `存糧小於 ${b.chef.retainAt}：等值釋放`, 'value'), range(b.chef.retainAt, b.chef.burstAt - 0.01, `存糧 ${b.chef.retainAt} 起：釋放後保留 ${b.chef.retention * 100}%`, 'value'), range(b.chef.burstAt, upper, `存糧 ${b.chef.burstAt} 起：傷害 ×${b.chef.multiplier}，保留 ${b.chef.highRetention * 100}%`, 'value')],
  porter: [range(b.porter.doubleAt, b.porter.doubleAt, `${b.porter.doubleAt} 連：全線接力值 ×${b.porter.multiplier}`), range(b.porter.tailAt, b.porter.tailAt, `${b.porter.tailAt} 連：全線 ×${b.porter.multiplier}，尾端最終攻擊再 ×${b.porter.multiplier}`), range(b.porter.repeatAt, upper, `${b.porter.repeatAt} 連以上：全線 ×${b.porter.multiplier}，尾端再 ×${b.porter.multiplier} 並再攻擊一次`)],
  follower: [{ text: '鄰骰有勇士：加入最高勇士基礎攻擊力', achieved: (i) => (i.count ?? 0) > 0 }, { text: `左右都有勇士：以 ${b.follower.repeatMultiplier * 100}% 攻擊再打一次`, achieved: (i) => i.secondaryCount === 2 }],
  loner: [{ text: `同骰只有一個土人獨行俠：基礎 ×${b.loner.multiplier}`, achieved: (i) => i.count === 1 }, { text: `場上無其他戰士：提升至 ×${b.loner.soloMultiplier}`, achieved: (i) => i.count === 1 && i.secondaryCount === 0 }],
  cheerleader: [range(1, upper, `每名 [戰士] 攻擊力 +${b.cheerleader.bonusPerWarrior}`), range(b.cheerleader.copyAt, upper, `${b.cheerleader.copyAt} 名以上：追加一次最強戰士的最終攻擊`)],
  warrior: [range(b.warrior.middle, b.warrior.high - 1, `${b.warrior.middle}～${b.warrior.high - 1} 跟班面：自身基礎 ×${b.warrior.multiplier}`), range(b.warrior.high, upper, `${b.warrior.high} 以上土人跟班：基礎攻擊力 ×${b.warrior.highMultiplier}`)],
  guard: [range(1, b.guard.threshold - 1, `1～${b.guard.threshold - 1} 名：每人 ${b.guard.shield} 護盾`), range(b.guard.threshold, upper, `${b.guard.threshold} 名以上：每人 ${b.guard.highShield} 護盾`)],
  artisan: [range(1, b.artisan.threshold - 1, `1～${b.artisan.threshold - 1} 職人鄰面：每面 ${b.artisan.shield} 護盾`), range(b.artisan.threshold, upper, `${b.artisan.threshold} 職人鄰面以上：每面 ${b.artisan.highShield} 護盾`)],
  elder: [range(1, b.elder.middle - 1, `1～${b.elder.middle - 1} 種：每種 +${b.elder.bonusPerSpecies}`), range(b.elder.middle, b.elder.high - 1, `${b.elder.middle}～${b.elder.high - 1} 種：每種 +${b.elder.middleBonus}`), range(b.elder.high, upper, `${b.elder.high} 種以上：每種 +${b.elder.highBonus}`)],
  priest: [range(1, b.priest.middle - 1, `1～${b.priest.middle - 1} 次：每次 ${b.priest.damagePerReroll} 追傷`), range(b.priest.middle, b.priest.splitAt - 1, `${b.priest.middle}～${b.priest.splitAt - 1} 次：每次 ${b.priest.middleDamage} 追傷`), range(b.priest.splitAt, upper, `${b.priest.splitAt} 次以上：每次 ${b.priest.highDamage} 追傷，平分成兩顆追加骰`)],
  knight: [range(1, b.knight.nobleAt - 1, `1～${b.knight.nobleAt - 1} 名普通：每名 +${b.knight.bonus}`), range(b.knight.nobleAt, b.knight.burstAt - 1, `${b.knight.nobleAt} 名普通：每名 +${b.knight.highBonus}，取得 [貴族]`), range(b.knight.burstAt, upper, `${b.knight.burstAt} 名普通以上：每名 +${b.knight.highBonus}，取得 [貴族]，支援後攻擊 ×${b.knight.multiplier}`)],
  royalGuard: [range(1, b.royalGuard.threshold - 1, `1～${b.royalGuard.threshold - 1} 面：每面 +${b.royalGuard.bonusPerNoble}`), range(b.royalGuard.threshold, upper, `${b.royalGuard.threshold} 面以上：每面 +${b.royalGuard.highBonus}`)],
  authority: [range(b.authority.threshold, upper, `冊封前已有 ${b.authority.threshold} 名 [貴族]：目標另獲基礎攻擊的 ${b.authority.bonus * 100}%`)],
  farmer: [range(1, b.farmer.threshold - 1, `有食物：最近一份食物 +${b.farmer.foodBonus}`), range(b.farmer.threshold, upper, `${b.farmer.threshold} 份以上：強化量為食物數 ×${b.farmer.foodBonus}`)],
  glutton: b.glutton.perFood.map((value, i) => range(i + 1, i === b.glutton.perFood.length - 1 ? upper : i + 1, `${i + 1} 份${i === b.glutton.perFood.length - 1 ? '以上' : ''}：每份增加 ${value * 100}% 基礎攻擊${i + 1 >= b.glutton.sumAt ? '，再加入所有食物值' : ''}`)),
  bulwark: [range(0, b.bulwark.middle - 0.01, `護盾小於 ${b.bulwark.middle}：轉傷 ${b.bulwark.lowMultiplier * 100}%`, 'value'), range(b.bulwark.middle, b.bulwark.high - 0.01, `護盾 ${b.bulwark.middle} 起：轉傷 ${b.bulwark.multiplier * 100}%`, 'value'), range(b.bulwark.high, upper, `護盾 ${b.bulwark.high} 起：轉傷 ${b.bulwark.highMultiplier * 100}%`, 'value')],
  herald: [range(1, b.herald.threshold - 1, `1～${b.herald.threshold - 1} 顆：每顆使全隊 +${b.herald.bonusPerAttack}`), range(b.herald.threshold, upper, `${b.herald.threshold} 顆以上：每顆使全隊 +${b.herald.highBonus}，所有追加骰各 +${b.herald.bonusDiceDamage}`)],
  fruit: [range(0, 0, `鄰骰各 +${b.fruit.bonus} 攻擊`), range(1, upper, `有其他 [食物]：鄰骰各 +${b.fruit.highBonus} 攻擊`)],
};
export const CREATURE_SKILL_INTRO: Record<CreatureId, string> = {
  arrowUp: ARROW_DESCRIPTION, arrowDown: ARROW_DESCRIPTION, arrowLeft: ARROW_DESCRIPTION, arrowRight: ARROW_DESCRIPTION,
  family: '依同骰土人家族總面數提升攻擊力。', sisters: '依場上土人姐妹花人數強化彼此。',
  twins: '取同骰最高雙胞胎基礎攻擊力。', gang: '依同骰相鄰的土人混混面數產生追加骰。',
  boss: '搶奪另一名普通土人的當前攻擊，本回合全場成功搶奪次數越高則提升越多。',
  loner: '依同骰配置與場上戰士強化自身。', chef: '同骰食物存入存糧；擲出廚師時釋放追加攻擊。',
  porter: '加上同一連線中左方土人搬運工的攻擊力。', follower: '查看左右鄰骰所有土人勇士面。',
  cheerleader: '為場上的戰士加油。', thief: '每次成功搶奪，以自身基礎攻擊追加一次。',
  coward: '被重骰時留下自身基礎攻擊力的護盾，每顆骰子每回合一次。', guard: '依場上普通或貴族土人數提供護盾。',
  warrior: `鄰骰每個土人跟班面，攻擊力 +${b.warrior.bonusPerFollower}。`, elder: '依場上不同土人種類提高攻擊力。',
  artisan: '依同骰相鄰職人面提供護盾。', priest: '本骰重骰時累積祭壇；擲出土人祭司結算時釋放並清空。',
  knight: '依場上其他普通土人提高攻擊力。', teacher: `免費重骰一顆最低值土人；數值提高時，本回合全隊每次重骰使其攻擊 +${b.teacher.bonus}。`,
  royalGuard: '依同骰其他貴族面提高攻擊。', prankster: '被重骰時，隨機重骰一顆鄰骰，每骰每回合一次。',
  authority: '將相鄰隨機一名普通土人冊封為貴族。', farmer: '沒有食物時變成好吃的；有食物時強化最近一份食物。',
  imposter: '偽裝成場上最多的其他角色；最高僅一名時改看同骰，仍無多數則不發動偽裝。',
  glutton: `依食物份數強化自身；沒有食物時基礎攻擊 ×${b.glutton.hungryMultiplier}。`,
  bulwark: '將本回合全隊新增護盾轉成一次追加攻擊，保留護盾。',
  bully: `搶走左右相鄰土人一半攻擊並取得 ×${b.bully.multiplier}；職人改為 ×${b.bully.craftsmanMultiplier}。`,
  herald: '依追加攻擊骰數強化全隊。', princess: '自身攻擊為零，命令其他貴族以最終攻擊再打一次。',
  detective: `沒收本回合犯人的當前攻擊，總和 ×${b.detective.multiplier} 由所有警探平分。`,
  fruit: '強化鄰骰；同骰有廚師時也能存糧。', food: '同骰有廚師時，同時存入存糧。',
};
export const creatureDescription = (id: CreatureId) => [CREATURE_SKILL_INTRO[id], ...(CREATURE_SKILL_STAGES[id] ?? []).map((stage) => stage.text)].join('\n');
