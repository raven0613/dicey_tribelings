export const TELEMETRY_CONFIG = {
  databaseName: 'tribelings-telemetry',
  schemaVersion: 3,
  gameVersion: '2026-10-04',
  balanceVersion: '2026-10-08-sisters-share-x3',
  maxRuns: 20,
  checkpointMs: 5000,
  hotspotSizePx: 20,
  shortcutCode: 'KeyS',
  exportPrefix: 'tribelings-runs',
  content: {
    id: 'crocodile-three-regions',
    name: '鱷魚人篇三區',
    chapterId: 'crocodile',
    chapterName: '鱷魚人篇',
    difficulty: 1,
  },
} as const;

export const RUN_RESULT_LABELS = {
  incomplete: '未完成',
  victory: '通關',
  death: '死亡',
  round_limit: '回合上限',
  abandoned: '重新開始',
} as const;
export const SNAPSHOT_LABELS = {
  start: '開局',
  build: '構築變更',
  preparation: '戰前準備',
  battle_start: '戰鬥開始',
  battle_end: '戰鬥結束',
  milestone: '完成紀錄',
  end: '本局結束',
} as const;
export const MILESTONE_LABELS = {
  region: '區域完成',
  chapter: '篇章完成',
  run: '整局通關',
} as const;
export const DAMAGE_SOURCE_LABELS = { intent: '敵方招式', grapple: '鉤索拉扯' } as const;

export const ACTIVITY_LABELS = {
  shop: '商店',
  reward: '獎勵選擇',
  configuration: '骰面配置',
  combatDecision: '戰鬥操作',
  combatAnimation: '戰鬥演出',
  camp: '營火',
  route: '選路',
  other: '其他',
} as const;
export const DECISION_LABELS = {
  purchase: '購買',
  heal: '恢復生命',
  refresh: '刷新',
  reward: '選擇獎勵',
  pack: '開包',
  skip: '放棄獎勵',
  camp: '營火選擇',
  equip: '取得／替換裝備',
  store: '收進背包',
  place: '貼附',
  move: '移動／交換',
  take: '取下',
  discard: '放棄貼紙',
  consume: '開戰消耗',
  reroll: '重骰',
  diceAction: '骰子操作',
  income: '取得收益',
  route: '選擇路線',
  acquire: '取得貼紙',
} as const;
export const OFFER_SOURCE_LABELS = {
  shop: '商店',
  reward: '戰利品',
  chest: '寶箱',
  camp: '營火',
  dice: '骰子獎勵',
  backpack: '背包',
  battle: '戰鬥',
  route: '路線',
} as const;
export const STICKER_POSITION_LABELS = {
  pending: '待處理',
  permanentBag: '永久背包',
  temporaryBag: '臨時背包',
  face: '永久骰面',
  temporaryFace: '臨時覆蓋',
} as const;
