import type { MonsterFeatureId } from './monsterPresentationConfig';
import type { EnemyDefinition, EnemyIntent, EnemyTraits, RegionId } from '../../types/enemy';

const attack = (value: number): EnemyIntent => ({ type: 'attack', name: '普攻', value });
const rest: EnemyIntent = { type: 'rest', name: '喘息' };
const charge: EnemyIntent = { type: 'charge', name: '蓄力' };
const strike = (value: number, threshold: number, effect: 'cancel' | 'halve' = 'halve'): EnemyIntent =>
  ({ type: 'heavy_attack', name: '重擊', value, counter: { type: 'damage_taken', threshold, effect } });
const shieldStrike = (value: number): EnemyIntent =>
  ({ type: 'heavy_attack', name: '盾撞', value, counter: { type: 'shield_depleted', effect: 'halve' } });
const defend = (value: number, threshold?: number): EnemyIntent =>
  ({ type: 'defend', name: '架盾', value, ...(threshold ? { counter: { type: 'damage_taken' as const, threshold, effect: 'cancel' as const } } : {}) });
const monster = (region: RegionId, key: string, name: string, rank: EnemyDefinition['rank'], mapFeatures: readonly MonsterFeatureId[], maxHp: number,
  initialShield: number, intents: [EnemyIntent, ...EnemyIntent[]], traits?: EnemyTraits, phases?: EnemyDefinition['phases']): EnemyDefinition =>
  ({ id: `r${region}_${key}`, region, name, rank, mapFeatures, maxHp, initialShield, intents, traits, phases, avatar: '🐊' });

const expose = (intent: EnemyIntent, multiplier = 1.5): EnemyIntent => ({ ...intent, expose: multiplier });
const combo = (value: number, hits: number, guardedFollowup?: number): EnemyIntent =>
  ({ type: 'attack', name: '連續斬擊', value, hits, guardedFollowup });
const swallow = (amount: number, uses: number): EnemyIntent =>
  ({ type: 'rest', name: '吞盾療傷', heal: { amount, uses, consumeShield: true } });
const cleave: EnemyIntent = { type: 'heavy_attack', name: '霸者狂劈', value: 30,
  counter: { type: 'damage_taken', threshold: 167, bonusReduction: 12, effect: 'halve' } };
const sweep: EnemyIntent = { type: 'attack', name: '橫掃千軍', value: 24, diverseTags: 3 };
const throne: EnemyIntent = { ...defend(80, 180), name: '死守王座', heal: { amount: 20, uses: 2 } };
const crush: EnemyIntent = { ...shieldStrike(26), name: '深淵重壓', stunOnBreak: true };

/** 鱷魚人難度一；招牌機制與所有數值以本表為準。 */
export const MONSTER_CONFIG: readonly EnemyDefinition[] = [
  monster(1, 'patrol', '鱷魚人新兵', 'normal', ['chargedStrike'], 25, 0, [attack(3), charge, { type: 'heavy_attack', name: '重擊', value: 7 }, rest]),
  monster(1, 'slinger', '四眼投石鱷', 'normal', ['seal', 'interruptible'], 30, 0, [{ ...strike(7, 15, 'cancel'), name: '封骰投石', seal: true }, attack(3)]),
  monster(1, 'veteran', '鱷魚人老兵', 'normal', ['damageWeaken', 'exposed'], 38, 0, [strike(8, 21), expose(attack(4)), rest]),
  monster(1, 'elite', '鱷魚人大塊頭', 'elite', ['chargedStrike', 'exposed'], 65, 0, [charge, expose(strike(12, 18)), attack(5), rest]),
  monster(1, 'boss', '鱷魚人巡佐', 'boss', ['interruptible'], 95, 0, [attack(6), strike(12, 25, 'cancel'), rest]),
  monster(2, 'boat', '鱷魚人船夫', 'normal', ['exposed'], 50, 0, [attack(4), expose({ ...attack(6), name: '船槳橫掃' }), rest]),
  monster(2, 'harpoon', '鱷魚人魚叉手', 'normal', ['grapple'], 42, 18, [{ ...shieldStrike(10), name: '魚叉鉤索', grapple: 5 }, rest, attack(4)]),
  monster(2, 'veteran', '水草浪人', 'normal', ['retaliation'], 55, 20, [{ ...attack(4), name: '迎擊架勢', retaliate: { bonusHits: 3, damage: 5 } }, shieldStrike(10), rest]),
  monster(2, 'elite', '爛泥重盾鱷', 'elite', ['shieldPower', 'shieldHeal'], 60, 45, [{ ...attack(8), name: '重盾壓制', shieldMultiplier: 2 }, defend(40), swallow(20, 2), attack(7)]),
  monster(2, 'waterway_bully', '水路鱷霸', 'boss', ['grapple', 'shieldPower'], 100, 60, [{ ...attack(10), name: '鎖鏈鉤索', grapple: 7 }, { ...attack(10), name: '持盾重擊', shieldMultiplier: 2 }, defend(60), rest]),
  monster(3, 'shield', '鐵皮鱷魚人', 'normal', ['hitArmor'], 75, 20, [attack(5), defend(12), attack(5)], { hitArmor: { layers: 4, multiplier: 0.5 } }),
  monster(3, 'spear', '荒地鱷棍', 'normal', ['chargedStrike', 'exposed'], 115, 0, [charge, expose(strike(14, 52)), rest]),
  monster(3, 'veteran', '黑市老鱷', 'normal', ['potion'], 135, 0, [attack(8), { type: 'rest', name: '黑市藥劑', heal: { amount: 30, uses: 1, belowHp: 0.6 } }]),
  monster(3, 'elite', '水寨雙煞', 'elite', ['multihit', 'guardedFollowup'], 155, 35, [combo(7, 3, 0.5), strike(18, 62, 'cancel'), combo(6, 2, 0.5), rest]),
  monster(3, 'boss', '鱷人幫當家', 'boss', ['strength', 'interruptible'], 270, 30, [{ ...defend(20, 76), name: '幫派號令', strength: 3 }, strike(24, 76, 'cancel'), attack(12), rest]),
  monster(4, 'blades', '雙刃鱷魚人', 'normal', ['multihit'], 145, 0, [combo(5, 2), combo(6, 2), rest]),
  monster(4, 'axe', '鱷魚人屠夫', 'normal', ['singleHitWeaken', 'unshielded'], 165, 0, [{ ...attack(12), name: '屠夫剁擊', unshieldedBonus: 5, singleHitThreshold: 35 }, attack(6), rest]),
  monster(4, 'veteran', '鱷魚人狂戰士', 'normal', ['hpHitGrowth'], 190, 0, [attack(7), attack(7), rest], { onHpHit: 3 }),
  monster(4, 'elite', '鱷魚人侍衛長', 'elite', ['shieldPower', 'defense'], 140, 100, [{ ...attack(8), name: '持盾強襲', shieldMultiplier: 2 }, strike(20, 90, 'cancel'), defend(100)]),
  monster(4, 'boss', '害鱷將軍', 'boss', ['exposed'], 360, 30,
    [attack(10), { type: 'heavy_attack', name: '重斬', value: 16 }, expose(attack(10)), rest]),
  monster(5, 'jailer', '鱷魚人囚徒', 'normal', ['defense'], 190, 0, [attack(7), defend(15, 100), rest]),
  monster(5, 'armored', '資深鱷囚', 'normal', ['shieldHeal'], 165, 0, [defend(125), swallow(30, 2), shieldStrike(16), attack(7)]),
  monster(5, 'veteran', '鱷囚看守者', 'normal', ['unshielded', 'seal'], 190, 50, [{ ...attack(8), name: '趁隙鞭打', unshieldedBonus: 6 }, { ...strike(10, 100, 'cancel'), name: '禁骰鐐銬', seal: true }, rest]),
  monster(5, 'elite', '鱷人劊子手', 'elite', ['execution', 'exposed'], 320, 50, [{ type: 'charge', name: '處刑倒數' }, expose({ ...strike(32, 123), name: '斷頭處刑' }, 1.75), attack(10), rest]),
  monster(5, 'boss', '爆鱷典獄長', 'boss', ['missingHpPower', 'defenseHeal'], 420, 65, [shieldStrike(18), { ...defend(50, 138), name: '鮮血壁壘', heal: { amount: 20, uses: 2 } }, shieldStrike(18), rest], { missingHpPower: { fraction: 0.2, damage: 3 } }),
  monster(6, 'blackguard', '黑甲鱷魚人', 'normal', ['hitArmor', 'comboVulnerability'], 200, 50, [attack(8), attack(8), rest], { hitArmor: { layers: 4, multiplier: 0.5 }, comboVulnerability: 0.08 }),
  monster(6, 'elite', '鱷魚人親衛', 'elite', ['shieldPower', 'multihit', 'guardedFollowup'], 345, 155, [{ ...attack(11), name: '持盾穿刺', shieldMultiplier: 2 }, combo(8, 3, 0.5), strike(24, 155), rest]),
  monster(6, 'boss', '獨眼霸主・鱷文', 'final_boss', ['phases', 'bonusInterrupt', 'shieldStun'], 670, 100,
    [cleave, sweep], undefined, [{ below: 0.65, intents: [throne, crush, sweep] }, { below: 0.3, intents: [cleave, sweep, throne, crush] }]),
];
