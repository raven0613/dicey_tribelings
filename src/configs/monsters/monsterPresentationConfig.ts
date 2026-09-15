import type { EnemyRank } from '../../types/enemy';

export const MONSTER_RANK_COLORS = {
  normal: '#e2e8f0',
  elite: '#c084fc',
  boss: '#fbbf24',
  final_boss: '#fb7185',
} satisfies Record<EnemyRank, string>;

export const MONSTER_FEATURE_NAMES = {
  chargedStrike: '蓄力重擊',
  interruptible: '可打斷',
  damageWeaken: '受傷削弱',
  exposed: '暴露弱點',
  seal: '封骰',
  grapple: '鉤索',
  retaliation: '受擊反擊',
  shieldPower: '持盾強攻',
  shieldHeal: '吞盾療傷',
  hitArmor: '次數甲',
  potion: '藥劑回血',
  multihit: '密集連擊',
  guardedFollowup: '格擋削弱',
  strength: '號令強化',
  singleHitWeaken: '重創踉蹌',
  unshielded: '無盾追擊',
  hpHitGrowth: '命中成長',
  defense: '架盾',
  execution: '處刑倒數',
  missingHpPower: '瀕死狂暴',
  defenseHeal: '架盾回血',
  comboVulnerability: '連擊破防',
  phases: '三階段變招',
  bonusInterrupt: '追傷破招',
  shieldStun: '破盾暈眩',
} as const;

export type MonsterFeatureId = keyof typeof MONSTER_FEATURE_NAMES;
