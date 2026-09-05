import type { EnemyDefinition } from '../../types/enemy';

// 設計入口：doc/monsters-and-regions.md。固定首版數值；校準假設見 monsterBalanceConfig.ts。
export const MONSTER_CONFIG: readonly EnemyDefinition[] = [
  // 第一區・苔石林徑
  {
    id: 'bubble_slime', name: '鼓泡史萊姆', region: 1, rank: 'normal',
    maxHp: 25, initialShield: 0, avatar: '🟢',
    intents: [
      { type: 'attack', name: '輕擊', value: 4 },
      { type: 'charge', name: '膨脹' },
      { type: 'heavy_attack', name: '重擊', value: 9 },
    ],
  },
  {
    id: 'rock_goblin', name: '投石哥布林・喀啦', region: 1, rank: 'normal',
    maxHp: 28, initialShield: 0, avatar: '👺',
    intents: [
      { type: 'heavy_attack', name: '巨石投擲', value: 9,
        counter: { type: 'damage_taken', threshold: 13, effect: 'cancel' } },
      { type: 'attack', name: '碎石', value: 4 },
    ],
  },
  {
    id: 'thorn_boar', name: '荊背岩豬', region: 1, rank: 'normal',
    maxHp: 22, initialShield: 10, avatar: '🐗',
    intents: [
      { type: 'heavy_attack', name: '甲殼衝撞', value: 10,
        counter: { type: 'shield_depleted', effect: 'halve' } },
      { type: 'rest', name: '喘息' },
      { type: 'attack', name: '獠牙', value: 5 },
    ],
  },
  {
    id: 'moss_colossus', name: '苔冠巨像', region: 1, rank: 'elite',
    maxHp: 44, initialShield: 0, avatar: '🗿',
    intents: [
      { type: 'attack', name: '重拳', value: 6 },
      { type: 'charge', name: '蓄力' },
      { type: 'heavy_attack', name: '裂地', value: 13,
        counter: { type: 'damage_taken', threshold: 14, effect: 'halve' } },
      { type: 'rest', name: '喘息' },
    ],
  },
  {
    id: 'mistroot_mur', name: '霧冠古樹穆爾', region: 1, rank: 'boss',
    maxHp: 38, initialShield: 0, avatar: '🌳',
    intents: [
      { type: 'attack', name: '根擊', value: 7 },
      { type: 'defend', name: '樹皮', value: 10 },
      { type: 'heavy_attack', name: '枝冠橫掃', value: 14,
        counter: { type: 'shield_depleted', effect: 'halve' } },
      { type: 'rest', name: '喘息' },
    ],
  },
  // 第二區・熔雷斷崖
  {
    id: 'blast_lizard', name: '爆囊火蜥', region: 2, rank: 'normal',
    maxHp: 64, initialShield: 0, avatar: '🦎',
    intents: [
      { type: 'charge', name: '蓄熱' },
      { type: 'heavy_attack', name: '爆囊噴發', value: 14,
        counter: { type: 'damage_taken', threshold: 29, effect: 'halve' } },
      { type: 'rest', name: '喘息' },
    ],
  },
  {
    id: 'molten_golem', name: '鎔核魔像', region: 2, rank: 'normal',
    maxHp: 55, initialShield: 0, avatar: '🌋',
    intents: [
      { type: 'defend', name: '鍛甲', value: 12 },
      { type: 'attack', name: '重拳', value: 7 },
      { type: 'attack', name: '重拳', value: 7 },
    ],
  },
  {
    id: 'thunder_falcon', name: '雷羽獵隼', region: 2, rank: 'normal',
    maxHp: 50, initialShield: 0, avatar: '🦅',
    intents: [
      { type: 'attack', name: '突襲', value: 6 },
      { type: 'attack', name: '突襲', value: 6 },
      { type: 'rest', name: '整羽' },
    ],
  },
  {
    id: 'wyvern_volta', name: '雷翼幼龍沃塔', region: 2, rank: 'elite',
    maxHp: 90, initialShield: 0, avatar: '🐉',
    intents: [
      { type: 'attack', name: '雷爪', value: 8 },
      { type: 'charge', name: '蓄力' },
      { type: 'heavy_attack', name: '雷息', value: 16,
        counter: { type: 'damage_taken', threshold: 30, effect: 'halve' } },
      { type: 'rest', name: '喘息' },
    ],
  },
  {
    id: 'hexa', name: '熔雷霸主赫克薩', region: 2, rank: 'boss',
    maxHp: 88, initialShield: 0, avatar: '🐲',
    intents: [
      { type: 'defend', name: '鍛甲', value: 20 },
      { type: 'heavy_attack', name: '爐甲衝撞', value: 16,
        counter: { type: 'shield_depleted', effect: 'halve' } },
      { type: 'charge', name: '蓄力' },
      { type: 'heavy_attack', name: '雷擊', value: 16 },
      { type: 'rest', name: '喘息' },
    ],
  },
  // 第三區・命運神殿
  {
    id: 'dial_attendant', name: '刻度侍從', region: 3, rank: 'normal',
    maxHp: 115, initialShield: 0, avatar: '⏳',
    intents: [
      { type: 'attack', name: '刻擊', value: 7 },
      { type: 'attack', name: '刻擊', value: 7 },
      { type: 'heavy_attack', name: '定刻重擊', value: 14 },
    ],
  },
  {
    id: 'chip_reaper', name: '籌碼收割者', region: 3, rank: 'normal',
    maxHp: 125, initialShield: 0, avatar: '💀',
    intents: [
      { type: 'charge', name: '磨刃' },
      { type: 'heavy_attack', name: '斬擊', value: 18 },
      { type: 'rest', name: '喘息' },
    ],
  },
  {
    id: 'mirror_judge', name: '鏡骰裁決官', region: 3, rank: 'normal',
    maxHp: 95, initialShield: 0, avatar: '🪞',
    intents: [
      { type: 'defend', name: '映照', value: 22,
        counter: { type: 'damage_taken', threshold: 55, effect: 'cancel' } },
      { type: 'attack', name: '鏡擊', value: 9 },
    ],
  },
  {
    id: 'priest_segs', name: '六目司祭賽格斯', region: 3, rank: 'elite',
    maxHp: 160, initialShield: 0, avatar: '👁️',
    intents: [
      { type: 'attack', name: '凝視', value: 9 },
      { type: 'heavy_attack', name: '宣判', value: 19,
        counter: { type: 'damage_taken', threshold: 57, effect: 'cancel' } },
      { type: 'rest', name: '喘息' },
    ],
  },
  {
    id: 'gatekeeper_moros', name: '命運守門人摩洛斯', region: 3, rank: 'boss',
    maxHp: 170, initialShield: 0, avatar: '🛡️',
    intents: [
      { type: 'defend', name: '立盾', value: 30 },
      { type: 'heavy_attack', name: '盾擊', value: 18,
        counter: { type: 'shield_depleted', effect: 'halve' } },
      { type: 'heavy_attack', name: '宣判', value: 20,
        counter: { type: 'damage_taken', threshold: 58, effect: 'cancel' } },
      { type: 'rest', name: '喘息' },
    ],
  },
  // 第四區・逆鐘工坊
  {
    id: 'gear_hound', name: '齒輪獵犬', region: 4, rank: 'normal',
    maxHp: 150, initialShield: 0, avatar: '🐺',
    intents: [
      { type: 'attack', name: '輕咬', value: 8 },
      { type: 'heavy_attack', name: '鋼牙撕咬', value: 15 },
    ],
  },
  {
    id: 'rivet_guard', name: '鉚甲守衛', region: 4, rank: 'normal',
    maxHp: 50, initialShield: 125, avatar: '🤖',
    intents: [
      { type: 'attack', name: '鉚拳', value: 8 },
      { type: 'heavy_attack', name: '鉚甲撞擊', value: 18,
        counter: { type: 'shield_depleted', effect: 'halve' } },
      { type: 'rest', name: '喘息' },
    ],
  },
  {
    id: 'broken_hand_executioner', name: '斷針劊子手', region: 4, rank: 'elite',
    maxHp: 240, initialShield: 0, avatar: '🪓',
    intents: [
      { type: 'heavy_attack', name: '斷針', value: 21,
        counter: { type: 'damage_taken', threshold: 85, effect: 'cancel' } },
      { type: 'rest', name: '校準' },
    ],
  },
  {
    id: 'clocksmith_olo', name: '逆鐘匠奧洛', region: 4, rank: 'boss',
    maxHp: 270, initialShield: 0, avatar: '🕰️',
    intents: [
      { type: 'attack', name: '時針', value: 9 },
      { type: 'defend', name: '鍛甲', value: 60 },
      { type: 'heavy_attack', name: '盾擊', value: 20,
        counter: { type: 'shield_depleted', effect: 'halve' } },
      { type: 'heavy_attack', name: '鐘擺斬', value: 22,
        counter: { type: 'damage_taken', threshold: 86, effect: 'halve' } },
      { type: 'rest', name: '喘息' },
    ],
  },
  // 第五區・碎星王庭
  {
    id: 'ash_crown_swordsman', name: '燼冠劍士', region: 5, rank: 'normal',
    maxHp: 245, initialShield: 0, avatar: '⚔️',
    intents: [
      { type: 'heavy_attack', name: '燼冠斬', value: 20,
        counter: { type: 'damage_taken', threshold: 116, effect: 'halve' } },
      { type: 'attack', name: '輕斬', value: 9 },
      { type: 'rest', name: '收勢' },
    ],
  },
  {
    id: 'star_shell_crab', name: '星殼巨蟹', region: 5, rank: 'normal',
    maxHp: 120, initialShield: 130, avatar: '🦀',
    intents: [
      { type: 'attack', name: '星鉗', value: 9 },
      { type: 'attack', name: '星鉗', value: 9 },
      { type: 'rest', name: '喘息' },
    ],
  },
  {
    id: 'court_bannerbreaker', name: '王庭破旗者', region: 5, rank: 'elite',
    maxHp: 340, initialShield: 0, avatar: '🚩',
    intents: [
      { type: 'attack', name: '旗槍', value: 10 },
      { type: 'charge', name: '舉旗' },
      { type: 'heavy_attack', name: '強攻', value: 23 },
      { type: 'rest', name: '喘息' },
    ],
  },
  {
    id: 'hollow_king_veyr', name: '空冠君王維爾', region: 5, rank: 'boss',
    maxHp: 360, initialShield: 0, avatar: '🤴',
    intents: [
      { type: 'defend', name: '立盾', value: 65 },
      { type: 'heavy_attack', name: '盾擊', value: 22,
        counter: { type: 'shield_depleted', effect: 'halve' } },
      { type: 'heavy_attack', name: '王權重斬', value: 24,
        counter: { type: 'damage_taken', threshold: 120, effect: 'cancel' } },
      { type: 'rest', name: '喘息' },
    ],
  },
  // 第六區・終局之座
  {
    id: 'throne_hound', name: '王座獵犬', region: 6, rank: 'normal',
    maxHp: 250, initialShield: 0, avatar: '🐺',
    intents: [{ type: 'attack', name: '王座撕咬', value: 10 }],
  },
  {
    id: 'last_gate_colossus', name: '終門巨像', region: 6, rank: 'elite',
    maxHp: 300, initialShield: 110, avatar: '🗿',
    intents: [
      { type: 'heavy_attack', name: '終門崩擊', value: 24,
        counter: { type: 'shield_depleted', effect: 'halve' } },
      { type: 'attack', name: '重拳', value: 11 },
      { type: 'rest', name: '喘息' },
    ],
  },
  {
    id: 'dice_sovereign', name: '骰之支配者', region: 6, rank: 'final_boss',
    maxHp: 570, initialShield: 0, avatar: '👑',
    intents: [
      { type: 'attack', name: '重拳', value: 11 },
      { type: 'defend', name: '立盾', value: 100 },
      { type: 'heavy_attack', name: '盾擊', value: 24,
        counter: { type: 'shield_depleted', effect: 'halve' } },
      { type: 'charge', name: '蓄力' },
      { type: 'heavy_attack', name: '終局審判', value: 28,
        counter: { type: 'damage_taken', threshold: 144, effect: 'halve' } },
      { type: 'rest', name: '喘息' },
    ],
  },
];
