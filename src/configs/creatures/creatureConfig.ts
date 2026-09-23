import type { CreatureDefinition, CreatureId, CreatureTag } from '../../types/creatures';
import { creatureDescription } from './creatureSkillConfig';

export const CREATURE_TAG_NAMES: Record<CreatureTag, string> = {
  common: '普通', warrior: '戰士', craftsman: '職人', noble: '貴族', mystery: '神秘', food: '食物',
};

export const CREATURE_TAG_COLORS: Record<CreatureTag, string> = {
  common: '#fcd9a0', warrior: '#fb9988', craftsman: '#79d8c7', noble: '#d5b4ff', mystery: '#a9b6e9', food: '#f7df83',
};

export const CREATURE_TAG_COLORS_DICE: Record<CreatureTag, string> = {
  common: '#2c2a26', warrior: '#e85e54', craftsman: '#34b0b2', noble: '#8b5acc', mystery: '#405dd4', food: '#d59527',
};
function role(name: string, emoji: string, tags: CreatureTag[], ability: string, description: string, rarity: CreatureDefinition['rarity'] = 'common'): CreatureDefinition {
  return { name, emoji, tags, ability, description, rarity, color: CREATURE_TAG_COLORS[tags[0]] };
}
export const CREATURE_CONFIG: Record<CreatureId, CreatureDefinition> = {
  family: role('土人家族', '👪', ['common'], '土人 在一起 強大', creatureDescription('family')),
  sisters: role('土人姐妹花', '👭', ['common'], '互相提攜', creatureDescription('sisters')),
  twins: role('土人雙胞胎', '👯', ['common'], '頂替上場', creatureDescription('twins')),
  gang: role('土人混混', '😎', ['common'], '人多勢眾', creatureDescription('gang')),
  boss: role('土人孩子王', '😏', ['common'], '現在是我的了', creatureDescription('boss')),
  loner: role('土人獨行俠', '🧥', ['warrior'], '孤獨一匹狼', creatureDescription('loner')),
  chef: role('土人廚師', '👨‍🍳', ['craftsman'], '加菜', creatureDescription('chef')),
  porter: role('土人搬運工', '📦', ['craftsman'], '接力', creatureDescription('porter')),
  follower: role('土人跟班', '🤩', ['common', 'warrior'], '勇士崇拜', creatureDescription('follower')),
  cheerleader: role('土人啦啦隊', '📣', ['common'], '加油', creatureDescription('cheerleader')),
  thief: role('土人毛賊', '🥷', ['common'], '趁火打劫', creatureDescription('thief')),
  coward: role('膽小土人', '😱', ['common'], '你不要過來啊', creatureDescription('coward')),
  guard: role('土人侍衛', '💂', ['warrior'], '護駕', creatureDescription('guard')),
  warrior: role('土人勇士', '⚔️', ['warrior'], '眾望所歸', creatureDescription('warrior')),
  elder: role('土人耆老', '👴', ['noble'], '部族之智', creatureDescription('elder'), 'rare'),
  artisan: role('土人工匠', '🔨', ['craftsman'], '鍛造', creatureDescription('artisan')),
  priest: role('土人祭司', '🔮', ['noble'], '犧牲召喚', creatureDescription('priest'), 'rare'),
  knight: role('土人騎士', '🗡️', ['warrior'], '我也算半個貴族', creatureDescription('knight')),
  teacher: role('土人老師', '👩‍🏫', ['craftsman'], '那我考考你', creatureDescription('teacher'), 'rare'),
  royalGuard: role('土人禁衛軍', '🛡️', ['warrior', 'noble'], '誓死效忠', creatureDescription('royalGuard'), 'rare'),
  prankster: role('土人搗蛋鬼', '🤪', ['common'], '大鬧一番', creatureDescription('prankster')),
  authority: role('土人權威', '🎖️', ['noble'], '賞你個名分', creatureDescription('authority'), 'rare'),
  farmer: role('土人農夫', '👨‍🌾', ['common', 'craftsman'], '自給自足', creatureDescription('farmer')),
  imposter: role('土人偽裝者', '🎭', ['mystery'], '混入人群', creatureDescription('imposter'), 'rare'),
  glutton: role('土人大胃王', '😋', ['common'], '暴飲暴食', creatureDescription('glutton'), 'rare'),
  bulwark: role('巨盾土人', '🛡️', ['warrior'], '連本帶利', creatureDescription('bulwark'), 'rare'),
  bully: role('土人惡霸', '🧐', ['noble'], '保護費', creatureDescription('bully'), 'rare'),
  herald: role('土人號角手', '📯', ['warrior'], '戰鬥狂熱', creatureDescription('herald'), 'rare'),
  princess: role('土人小公主', '👸', ['noble'], '全體起立！', creatureDescription('princess'), 'legendary'),
  detective: role('土人警探', '🕵️', ['craftsman'], '人贓俱獲', creatureDescription('detective'), 'rare'),
  fruit: role('水果拼盤', '🍇', ['food'], '水果拼盤', creatureDescription('fruit')),
  food: role('好吃的', '🍖', ['food'], '好吃的', creatureDescription('food')),
};
export const CREATURE_IDS = Object.keys(CREATURE_CONFIG) as CreatureId[];
