import type { CreatureDefinition, CreatureId, CreatureTag } from '../../types/creatures';
import { CREATURE_BALANCE as b } from './creatureBalanceConfig';

export const CREATURE_TAG_NAMES: Record<CreatureTag, string> = {
  common: '普通', warrior: '戰士', craftsman: '職人', noble: '貴族', mystery: '神秘', food: '食物',
};

const colors: Record<CreatureTag, string> = {
  common: '#fcd9a0', warrior: '#fb9988', craftsman: '#79d8c7', noble: '#d5b4ff', mystery: '#a9b6e9', food: '#f7df83',
};
function role(name: string, emoji: string, tags: CreatureTag[], ability: string, description: string): CreatureDefinition {
  return { name, emoji, tags, ability, description, color: colors[tags[0]] };
}
export const CREATURE_CONFIG: Record<CreatureId, CreatureDefinition> = {
  family: role('土人家族', '👪', ['common'], '土人 在一起 強大', `同骰每個其他家族面，攻擊 +${b.family.bonus}。`),
  sisters: role('土人姐妹花', '👭', ['common'], '互相提攜', `朝上至少 ${b.sisters.minimum} 名姐妹花，每名攻擊 +${b.sisters.bonus}。`),
  twins: role('土人雙胞胎', '👯', ['common'], '替身', '本回合基礎值取同骰最高雙胞胎的基礎值。'),
  gang: role('土人混混', '😎', ['common'], '烙人', `同骰至少 ${b.gang.minimum} 個混混面，追加一次基礎攻擊。`),
  boss: role('土人孩子王', '😏', ['common'], '搶奪', `隨機搶另一名有攻擊的普通土人，取得其當前攻擊 ×${b.boss.multiplier}，目標歸零。每名目標每回合限一次，孩子王可以互搶。`),
  loner: role('土人獨行俠', '🧥', ['warrior'], '孤獨一匹狼', `同骰只有一個獨行俠面時，基礎攻擊 ×${b.loner.multiplier}。`),
  chef: role('土人廚師', '👨‍🍳', ['craftsman'], '加菜', '同骰擲出食物時照常攻擊，基礎值累加儲存；擲出廚師時將儲糧化為追加攻擊並清空。戰後歸零。'),
  porter: role('土人搬運工', '📦', ['craftsman'], '接力', '連續搬運工隊列的最後一名，基礎攻擊乘以隊列人數，其餘照常攻擊。'),
  follower: role('土人跟班', '🤩', ['warrior'], '勇士崇拜', '取得左右鄰骰所有勇士面中最高基礎值，加到攻擊。'),
  cheerleader: role('土人啦啦隊', '📣', ['common'], '加油', `依朝上戰士數量 ×${b.cheerleader.damagePerWarrior}，追加攻擊一次。`),
  thief: role('土人毛賊', '🥷', ['common'], '趁火打劫', '本回合成功搶奪後追加一次基礎攻擊；曾被搶到歸零的毛賊失去此次追加攻擊。'),
  coward: role('膽小土人', '😱', ['common'], '你不要過來啊', '被重骰時留下等同基礎值的護盾，每骰每回合一次。'),
  guard: role('土人侍衛', '💂', ['warrior'], '護駕', `每名朝上具有普通或貴族標籤的土人提供 ${b.guard.shield} 護盾。`),
  warrior: role('土人勇士', '⚔️', ['warrior'], '眾望所歸', `場上與同骰每個跟班提供攻擊 +${b.warrior.bonusPerFollower}。`),
  elder: role('土人耆老', '👴', ['noble'], '部族之智', `每種朝上的土人提供攻擊 +${b.elder.bonusPerSpecies}。`),
  artisan: role('土人工匠', '🔨', ['craftsman'], '鍛造', `同骰有工匠時，每名朝上的鄰骰土人提供 ${b.artisan.shield} 護盾，每骰每回合一次。`),
  priest: role('土人祭司', '🔮', ['noble'], '犧牲召喚', `在場目睹每次重骰累積 ${b.priest.damagePerReroll} 追加傷害，當回合釋放；自身被骰掉仍保留。`),
  knight: role('土人騎士', '🗡️', ['warrior'], '我也算半個貴族', `場上有其他普通土人時，攻擊 +${b.knight.bonus}。`),
  teacher: role('土人老師', '👩‍🏫', ['craftsman'], '那我考考你', `每回合初擲的老師可令一顆最低基礎值土人骰免費重骰一次，擲出更高基礎值時攻擊 +${b.teacher.bonus}。`),
  royalGuard: role('土人禁衛軍', '🛡️', ['warrior', 'noble'], '誓死效忠', `同骰每個其他貴族面提供攻擊 +${b.royalGuard.bonusPerNoble}。`),
  prankster: role('土人搗蛋鬼', '🤪', ['common'], '大鬧一番', '自身被重骰時，隨機重骰一顆朝上為土人的鄰骰；每骰每回合觸發一次。'),
  authority: role('土人權威', '🎖️', ['noble'], '賞你個名分', '隨機將一名相鄰普通土人的普通標籤替換為貴族；目標仍有效時維持。'),
  farmer: role('土人農夫', '👨‍🌾', ['common', 'craftsman'], '自給自足', `鎖定時沒有食物，農夫一起變為自身基礎值的好吃的；已有食物時，每名農夫提供總計 +${b.farmer.foodBonus} 基礎值，由朝上食物平分。`),
  imposter: role('土人偽裝者', '🎭', ['mystery'], '混入人群', '最多的一種朝上土人額外計數一次，平手隨機；虛擬面只計數。'),
  glutton: role('土人大胃王', '😋', ['common'], '暴飲暴食', `每份場上食物使基礎攻擊倍率 +${b.glutton.foodMultiplier}；沒有食物時基礎攻擊 ×${b.glutton.hungryMultiplier}。`),
  bulwark: role('巨盾土人', '🛡️', ['warrior'], '連本帶利', '依本回合全隊累計獲得護盾，追加一次等值攻擊，護盾完整保留。'),
  bully: role('土人惡霸', '🧐', ['noble'], '保護費', `扣除一名鄰骰土人當前攻擊的一半，取得扣除量 ×${b.bully.multiplier}；職人目標改為 ×${b.bully.craftsmanMultiplier}。`),
  herald: role('土人號角手', '📯', ['warrior'], '戰鬥狂熱', `每顆追加骰使全體正常骰攻擊 +${b.herald.bonusPerAttack}，多名號角手疊加。`),
  princess: role('土人小公主', '👸', ['noble'], '全體起立！', '自身起始攻擊為 0。命令其他攻擊大於 0 的貴族按最終值再攻擊一次；多名公主各自命令。'),
  food: role('好吃的', '🍖', ['food'], '好吃的', '以基礎值攻擊，供同骰廚師儲糧，並支援大胃王。'),
};
export const CREATURE_IDS = Object.keys(CREATURE_CONFIG) as CreatureId[];
