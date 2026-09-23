export const TELEMETRY_CONFIG = {
  databaseName: 'tribelings-telemetry',
  schemaVersion: 1,
  gameVersion: '2026-09-23',
  balanceVersion: '2026-09-23',
  maxRuns: 10,
  checkpointMs: 5000,
  hotspotSizePx: 20,
  shortcutCode: 'KeyS',
  exportPrefix: 'tribelings-runs',
  content: { id: 'crocodile-six-regions', name: '鱷魚人篇六區', chapterId: 'crocodile', chapterName: '鱷魚人篇', difficulty: 1 },
} as const;

export const RUN_RESULT_LABELS = {
  incomplete: '未完成', victory: '通關', death: '死亡', round_limit: '回合上限', abandoned: '重新開始',
} as const;
export const SNAPSHOT_LABELS = {
  start: '開局', build: '構築變更', preparation: '戰前準備', battle_start: '戰鬥開始', battle_end: '戰鬥結束', milestone: '完成紀錄', end: '本局結束',
} as const;
export const MILESTONE_LABELS = { region: '區域完成', chapter: '篇章完成', run: '整局通關' } as const;
export const DAMAGE_SOURCE_LABELS = { intent: '敵方招式', retaliation: '敵方反擊', grapple: '鉤索拉扯' } as const;
