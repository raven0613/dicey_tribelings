import type { CreatureDefinition, CreatureId, CreatureTag } from '../../types/creatures';
import { CREATURE_BALANCE as b } from './creatureBalanceConfig';

export const CREATURE_TAG_NAMES: Record<CreatureTag, string> = {
  common: '普通', warrior: '戰士', craftsman: '職人', noble: '貴族', mystery: '神秘', food: '食物',
};

const colors: Record<CreatureTag, string> = {
  common: '#fcd9a0', warrior: '#fb9988', craftsman: '#79d8c7', noble: '#d5b4ff', mystery: '#a9b6e9', food: '#f7df83',
};
function role(name: string, emoji: string, tags: CreatureTag[], ability: string, description: string, rarity: CreatureDefinition['rarity'] = 'common'): CreatureDefinition {
  return { name, emoji, tags, ability, description, rarity, color: colors[tags[0]] };
}
export const CREATURE_CONFIG: Record<CreatureId, CreatureDefinition> = {
  family: role('土人家族', '👪', ['common'], '土人 在一起 強大', `同骰每個其他土人家族，攻擊力 +${b.family.bonus}。`),
  sisters: role('土人姐妹花', '👭', ['common'], '互相提攜', `骰出至少 ${b.sisters.minimum} 名土人姐妹花時，每名攻擊力 +${b.sisters.bonus}。`),
  twins: role('土人雙胞胎', '👯', ['common'], '頂替上場', '本回合攻擊力取同骰中最高的土人雙胞胎的基礎攻擊力。'),
  gang: role('土人混混', '😎', ['common'], '人多勢眾', `同骰相鄰面每有 1 個土人混混，追加一次 ${b.gang.damagePerNeighbor} 點攻擊。`),
  boss: role('土人孩子王', '😏', ['common'], '現在是我的了', `搶奪隨機 1 名 [普通] 土人的全部攻擊 ×${b.boss.multiplier}。`),
  loner: role('土人獨行俠', '🧥', ['warrior'], '孤獨一匹狼', `同骰中沒有其他土人獨行俠時，基礎攻擊 ×${b.loner.multiplier}。`),
  chef: role('土人廚師', '👨‍🍳', ['craftsman'], '加菜', '同骰擲出 [食物] 時存入儲糧；自身擲出時，消耗所有儲糧轉為等值追加攻擊。'),
  porter: role('土人搬運工', '📦', ['craftsman'], '接力', '與其他土人搬運工相連時，隊列最右側的一名攻擊力 × 連接人數。'),
  follower: role('土人跟班', '🤩', ['common', 'warrior'], '勇士崇拜', '左右鄰骰中若有土人勇士，獲得其中最高的基礎攻擊力加值。'),
  cheerleader: role('土人啦啦隊', '📣', ['common'], '加油', `依骰出的 [戰士] 數量 ×${b.cheerleader.damagePerWarrior}，追加攻擊一次。`),
  thief: role('土人毛賊', '🥷', ['common'], '趁火打劫', '本回合若發生搶奪，追加一次基礎攻擊。'),
  coward: role('膽小土人', '😱', ['common'], '你不要過來啊', '被重骰時留下等同基礎攻擊力的護盾。'),
  guard: role('土人侍衛', '💂', ['warrior'], '護駕', `場上每有 1 名 [普通] 或 [貴族] 土人，獲得 ${b.guard.shield} 護盾。`),
  warrior: role('土人勇士', '⚔️', ['warrior'], '眾望所歸', `左右鄰骰中每有 1 個土人跟班面，攻擊力 +${b.warrior.bonusPerFollower}。`),
  elder: role('土人耆老', '👴', ['noble'], '部族之智', `骰出的每種不同土人提供攻擊力 +${b.elder.bonusPerSpecies}。`, 'rare'),
  artisan: role('土人工匠', '🔨', ['craftsman'], '鍛造', `同骰相鄰面每有 1 個 [職人] 面，提供 ${b.artisan.shield} 護盾。`),
  priest: role('土人祭司', '🔮', ['noble'], '犧牲召喚', `在場時每次重骰累積 ${b.priest.damagePerReroll} 追加傷害，結算時釋放。`, 'rare'),
  knight: role('土人騎士', '🗡️', ['warrior'], '我也算半個貴族', `場上有其他 [普通] 土人時，攻擊力 +${b.knight.bonus}。`),
  teacher: role('土人老師', '👩‍🏫', ['craftsman'], '那我考考你', `重骰一顆最低基礎攻擊力的土人，若重骰後數值提高，該土人攻擊力 +${b.teacher.bonus}。`, 'rare'),
  royalGuard: role('土人禁衛軍', '🛡️', ['warrior', 'noble'], '誓死效忠', `同骰配置中每有 1 位 [貴族] 土人，提升攻擊力 +${b.royalGuard.bonusPerNoble}。`, 'rare'),
  prankster: role('土人搗蛋鬼', '🤪', ['common'], '大鬧一番', '自身被重骰時，隨機重骰一顆土人鄰骰。'),
  authority: role('土人權威', '🎖️', ['noble'], '賞你個名分', '本回合將隨機 1 名相鄰的 [普通] 土人視為 [貴族]。', 'rare'),
  farmer: role('土人農夫', '👨‍🌾', ['common', 'craftsman'], '自給自足', `若場上沒有 [食物]，自身轉化為好吃的；已有 [食物] 時，使最接近的 1 份 [食物] 攻擊力 +${b.farmer.foodBonus}。`),
  imposter: role('土人偽裝者', '🎭', ['mystery'], '混入人群', '本回合首次出現時偽裝成場上最多的一種其他角色或食物。', 'rare'),
  glutton: role('土人大胃王', '😋', ['common'], '暴飲暴食', `每份場上 [食物] 使基礎攻擊力倍率 +${b.glutton.foodMultiplier}；沒有食物時基礎攻擊力 ×${b.glutton.hungryMultiplier}。`, 'rare'),
  bulwark: role('巨盾土人', '🛡️', ['warrior'], '連本帶利', '依本回合全隊累計獲得的護盾，追加一次等值攻擊。', 'rare'),
  bully: role('土人惡霸', '🧐', ['noble'], '保護費', `搶奪相鄰 1 名土人的 50% 攻擊力（×${b.bully.multiplier}）；若目標為 [職人]，自身收益翻倍。`, 'rare'),
  herald: role('土人號角手', '📯', ['warrior'], '戰鬥狂熱', `結算時，每有 1 顆追加攻擊骰，全隊攻擊力 +${b.herald.bonusPerAttack}。`, 'rare'),
  princess: role('土人小公主', '👸', ['noble'], '全體起立！', '命令場上其他 [貴族] 土人額外發動一次攻擊。', 'legendary'),
  food: role('好吃的', '🍖', ['food'], '好吃的', '供同骰土人廚師儲糧，並支援土人大胃王。'),
};
export const CREATURE_IDS = Object.keys(CREATURE_CONFIG) as CreatureId[];
