import { packReferences, unpackReferences, type JsonValue } from './references';
import {
  ACTIVITY_LABELS,
  DECISION_LABELS,
  OFFER_SOURCE_LABELS,
  STICKER_POSITION_LABELS,
  TELEMETRY_CONFIG,
} from '../../configs/telemetryConfig';
import type { RunRecord } from './types';
import { rerollSummary } from './analytics';

export function exportDocument(runs: readonly RunRecord[], now: number) {
  const packed = packReferences(
    runs.map((run) => ({ ...run, rerollSummary: rerollSummary(run.battles) })),
  );
  return {
    encoding: packed.encoding,
    schemaVersion: TELEMETRY_CONFIG.schemaVersion,
    exportedAt: now,
    units: {
      timestamp: 'unix_epoch_milliseconds',
      duration: 'milliseconds',
      percentage: '0_to_100',
    },
    definitions: {
      activityLabels: ACTIVITY_LABELS,
      decisionLabels: DECISION_LABELS,
      sourceLabels: OFFER_SOURCE_LABELS,
      positionLabels: STICKER_POSITION_LABELS,
      offers:
        '候選保存可見物品與隱藏張數；實際取得內容保存在 decisions.items，以 offerId 對應候選批次',
      resources: '操作提交前後的 gold、hp、control；after 減 before 為實際收支或有效治療',
      enemyActions: '逐敵人與來源彙總已提交攻擊；damage 包含溢傷，hpLoss 與 absorbed 是實際損失',
      activityMs: '依當時遊戲狀態分類的前景時間，各分類總和等於 activeMs',
      indices: '骰面索引與骰池位置以 0 起算；panel 顯示時以 1 起算',

      references: '所有 $ref 均引用同一檔案 records；還原後可逐局獨立閱讀。',
      historicalFields: '舊紀錄省略的新欄位代表未記錄，與零或空清單不同。',
      composition: '永久角色面數 / 全部骰子實際總面數 × 100；臨時貼紙另存於完整配置',
      rerolls: '每顆骰子每次實際重骰計一次；包含老師及連鎖，初擲與翻面除外',
      averageRerolls: '已結束戰鬥的重骰總數 / 已結束戰鬥場數；包含勝利與失敗',
      activeMs: '視窗聚焦且頁面可見的遊玩時間，包含演出與選擇',
      equipmentHeldMs: '持有裝備期間的前景遊玩時間',
      incomplete: '未記錄到通關、死亡或主動重新開始；最後保存後的遊玩資料可能尚未寫入',
      roundOutput: '正式提交結算時的總輸出；實際扣血與扣盾另列 damageHp / damageShield',
      bonusAttacks: '正式結算產生的追加與再攻擊數，包含擊殺後未造成實際損失的攻擊',
    },
    runs: packed.data as JsonValue[],
    records: packed.records,
  };
}

export function readExport(document: ReturnType<typeof exportDocument>): RunRecord[] {
  return unpackReferences({
    encoding: document.encoding,
    records: document.records,
    data: document.runs,
  }) as unknown as RunRecord[];
}

export function downloadRuns(runs: readonly RunRecord[]): void {
  const now = Date.now();
  const blob = new Blob([JSON.stringify(exportDocument(runs, now), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${TELEMETRY_CONFIG.exportPrefix}-${new Date(now).toISOString().replaceAll(':', '-')}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
