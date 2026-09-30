import type { MonsterFeatureId } from './monsterPresentationConfig';
import type { EnemyDefinition, EnemyIntent, EnemyTraits, RegionId } from '../../types/enemy';
const attack = (value: number, name = '普攻'): EnemyIntent => ({ type: 'attack', name, value });
const heavy = (value: number, name = '重擊'): EnemyIntent => ({ type: 'heavy_attack', name, value });
const rest: EnemyIntent = { type: 'rest', name: '喘息' };
const monster = (region: RegionId, key: string, name: string, rank: EnemyDefinition['rank'], mapFeatures: readonly MonsterFeatureId[],
  maxHp: number, initialShield: number, intents: [EnemyIntent, ...EnemyIntent[]], traits?: EnemyTraits, phases?: EnemyDefinition['phases']): EnemyDefinition =>
  ({ id: `r${region}_${key}`, region, name, rank, mapFeatures, maxHp, initialShield, intents, traits, phases });
const seal = (value: number, threshold: number): EnemyIntent => ({ ...heavy(value, '封骰投石'), seal: true,
  counter: { type: 'damage_taken', threshold, effect: 'cancel' } });
const hook = (value: number, damage: number, breakDamage: number): EnemyIntent =>
  ({ ...attack(value, '鉤索突刺'), grapple: { damage, breakDamage } });
const stance = (defense: number, offense: number): [EnemyIntent, EnemyIntent] => [
  { ...attack(defense, '守勢反擊'), mitigation: 0.5 }, heavy(offense, '全力猛攻'),
];
/** 每組遭遇的主將和小兵分別配置；數值依三／四／五骰進度調校。 */
export const MONSTER_CONFIG: readonly EnemyDefinition[] = [
  monster(1, 'patrol', '鱷魚人新兵', 'normal', ['chargedStrike'], 30, 0,
    [attack(4), { type: 'charge', name: '蓄力' }, heavy(9), rest]),
  monster(1, 'harpoon', '鱷魚人魚叉手', 'normal', ['grapple'], 40, 0, [hook(6, 5, 12), attack(5), rest]),
  monster(1, 'boat', '鱷魚人船夫', 'normal', ['multihit'], 47, 0,
    [attack(8, '船槳直擊'), { ...attack(4, '船槳橫掃'), hits: 2 }]),
  monster(1, 'ronin', '水草浪人', 'elite', ['exposed'], 78, 0,
    [{ ...heavy(8, '拔刀斬'), exposeOnBlock: 1.5 }, attack(7), rest]),
  monster(1, 'slinger', '四眼投石鱷', 'normal', ['seal', 'interruptible'], 43, 0, [seal(9, 16), attack(5)]),
  monster(1, 'grunt', '鱷魚人新兵（小兵）', 'normal', ['chargedStrike'], 12, 0, [attack(2), attack(3)]),
  monster(1, 'boss', '水路鱷霸', 'boss', ['grapple', 'shieldPower'], 78, 15,
    [hook(8, 6, 18), { ...heavy(8, '持盾重擊'), shieldMultiplier: 2 }, { type: 'defend', name: '架盾', value: 16 }, attack(6)]),
  monster(2, 'iron', '鐵皮鱷魚人', 'normal', ['hitArmor'], 77, 0,
    [attack(10), attack(8)], { hitArmor: { layers: 5, multiplier: 0.5 } }),
  monster(2, 'club', '荒地鱷棍', 'normal', ['fatigue'], 92, 0,
    [heavy(16, '猛棍'), attack(10, '奮力揮棍'), attack(5, '疲弱揮棍')], { fatigue: true }),
  monster(2, 'market', '黑市老鱷', 'normal', ['contraband'], 106, 0,
    [attack(8), attack(9), attack(10, '收起貨物')], { contraband: { deadline: 3 } }),
  monster(2, 'captain', '鱷魚人侍衛長', 'elite', ['defense'], 135, 0, stance(7, 20)),
  monster(2, 'chief', '鱷人幫當家', 'normal', ['strength', 'interruptible'], 86, 0,
    [{ type: 'charge', name: '幫派號令', command: 3, counter: { type: 'damage_taken', threshold: 24, effect: 'cancel' } }, attack(8)]),
  monster(2, 'blades', '雙刃鱷魚人（小兵）', 'normal', ['multihit'], 19, 0, [{ ...attack(2, '雙刃'), hits: 2 }]),
  monster(2, 'first', '水寨雙煞（先手）', 'boss', ['dual'], 115, 0,
    [{ ...heavy(17, '先手重斬'), hitWeaken: 4 }, attack(9)]),
  monster(2, 'second', '水寨雙煞（後手）', 'boss', ['dual'], 100, 0,
    [{ ...attack(5, '後手連斬'), hits: 3, shieldWeaken: 6 }, attack(7)]),
  monster(3, 'prisoner', '鱷魚人囚徒', 'normal', ['watch'], 143, 0,
    [attack(13, '盯防突刺'), attack(11)], { watch: { multiplier: 0.5 } }),
  monster(3, 'jailer', '鱷囚看守者', 'normal', ['seal', 'interruptible'], 136, 0, [seal(15, 36), attack(10)]),
  monster(3, 'guard', '鱷魚人親衛（小兵）', 'normal', ['defense'], 26, 4, [attack(3), { ...attack(2), shieldGain: 3 }]),
  monster(3, 'warden', '爆鱷典獄長', 'elite', ['fury'], 219, 0,
    [attack(13), attack(11)], { rerollFury: { threshold: 3, intent: heavy(27, '蓄怒猛攻') } }),
  monster(3, 'black', '黑甲鱷魚人', 'normal', ['hitArmor'], 96, 0,
    [attack(12), attack(10)], { hitArmor: { layers: 7, multiplier: 0.5 } }),
  monster(3, 'boss', '獨眼霸主・鱷文', 'final_boss', ['phases', 'dual'], 420, 0,
    [{ ...heavy(11, '霸者連劈'), hits: 3, hitWeaken: 5, shieldWeaken: 10 }, attack(15)],
    undefined, [{ below: 0.5, intents: stance(10, 29) }]),
];
