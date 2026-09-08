import type { EnemyDefinition, EnemyIntent, RegionId } from '../../types/enemy';

const attack = (value: number): EnemyIntent => ({ type: 'attack', name: '普攻', value });
const rest: EnemyIntent = { type: 'rest', name: '喘息' };
const charge: EnemyIntent = { type: 'charge', name: '蓄力' };
const strike = (value: number, threshold: number, effect: 'cancel' | 'halve' = 'halve'): EnemyIntent =>
  ({ type: 'heavy_attack', name: '重擊', value, counter: { type: 'damage_taken', threshold, effect } });
const shieldStrike = (value: number): EnemyIntent =>
  ({ type: 'heavy_attack', name: '盾撞', value, counter: { type: 'shield_depleted', effect: 'halve' } });
const defend = (value: number, threshold?: number): EnemyIntent =>
  ({ type: 'defend', name: '架盾', value, ...(threshold ? { counter: { type: 'damage_taken' as const, threshold, effect: 'cancel' as const } } : {}) });
const monster = (region: RegionId, key: string, name: string, rank: EnemyDefinition['rank'], maxHp: number,
  initialShield: number, intents: [EnemyIntent, ...EnemyIntent[]]): EnemyDefinition =>
  ({ id: `r${region}_${key}`, region, name, rank, maxHp, initialShield, intents, avatar: '🐊' });

/** 每個戰鬥節點具有固定敵人與數值；能力沿用共通 Intent。 */
export const MONSTER_CONFIG: readonly EnemyDefinition[] = [
  monster(1, 'patrol', '巡邏兵', 'normal', 25, 0, [attack(3), charge, { type: 'heavy_attack', name: '重擊', value: 7 }, rest]),
  monster(1, 'slinger', '投石兵', 'normal', 30, 0, [strike(7, 15, 'cancel'), attack(3)]),
  monster(1, 'veteran', '巡邏老兵', 'normal', 38, 0, [strike(8, 21), attack(4), rest]),
  monster(1, 'elite', '大塊頭', 'elite', 65, 0, [charge, strike(12, 18), attack(5), rest]),
  monster(1, 'boss', '巡邏隊長', 'boss', 95, 0, [attack(6), strike(12, 25, 'cancel'), rest]),
  monster(2, 'boat', '撐船兵', 'normal', 50, 0, [attack(4), attack(4), rest]),
  monster(2, 'harpoon', '魚叉兵', 'normal', 42, 18, [shieldStrike(10), rest, attack(4)]),
  monster(2, 'veteran', '魚叉老兵', 'normal', 55, 20, [shieldStrike(10), attack(4), rest]),
  monster(2, 'elite', '巨盾兵', 'elite', 80, 25, [shieldStrike(16), attack(7), defend(25), rest]),
  monster(2, 'boss', '水道頭目', 'boss', 125, 35, [shieldStrike(20), attack(10), defend(25), rest]),
  monster(3, 'shield', '鐵盾兵', 'normal', 75, 20, [defend(12), attack(5), attack(5)]),
  monster(3, 'spear', '長槍兵', 'normal', 115, 0, [charge, strike(14, 52), rest]),
  monster(3, 'veteran', '長槍老兵', 'normal', 135, 0, [attack(6), strike(14, 65), rest]),
  monster(3, 'elite', '重甲兵', 'elite', 155, 35, [shieldStrike(18), strike(18, 62, 'cancel'), attack(6), rest]),
  monster(3, 'boss', '守門隊長', 'boss', 270, 30, [charge, strike(24, 76, 'cancel'), attack(12), defend(35), rest]),
  monster(4, 'blades', '雙刀兵', 'normal', 145, 0, [attack(6), attack(7), rest]),
  monster(4, 'axe', '斧頭兵', 'normal', 165, 0, [strike(14, 80), attack(6), rest]),
  monster(4, 'veteran', '雙刀老兵', 'normal', 190, 0, [attack(7), attack(7), rest]),
  monster(4, 'elite', '斧兵隊長', 'elite', 250, 30, [attack(8), strike(20, 90, 'cancel'), attack(8), rest]),
  monster(4, 'boss', '鱷魚將軍', 'boss', 360, 30,
    [attack(10), { type: 'heavy_attack', name: '重斬', value: 16 }, attack(10), rest]),
  monster(5, 'jailer', '看守', 'normal', 190, 0, [attack(7), defend(15, 100), rest]),
  monster(5, 'armored', '鐵甲兵', 'normal', 165, 45, [shieldStrike(16), attack(7), rest]),
  monster(5, 'veteran', '鐵甲老兵', 'normal', 190, 50, [shieldStrike(18), attack(8), rest]),
  monster(5, 'elite', '行刑官', 'elite', 320, 50, [charge, strike(24, 123), attack(10), rest]),
  monster(5, 'boss', '典獄長', 'boss', 420, 65, [shieldStrike(24), defend(70, 138), shieldStrike(24), rest]),
  monster(6, 'blackguard', '黑甲兵', 'normal', 200, 50, [attack(8), attack(8), rest]),
  monster(6, 'elite', '王家近衛', 'elite', 440, 60, [shieldStrike(22), strike(24, 155), attack(10), rest]),
  monster(6, 'boss', '鱷魚王', 'final_boss', 670, 100,
    [strike(30, 167), attack(14), shieldStrike(26), defend(80), rest]),
];
