import { TELEMETRY_CONFIG } from '../../configs/telemetryConfig';
import type { RunRecord } from './types';
import { rerollSummary } from './analytics';

export function exportDocument(runs: readonly RunRecord[], now: number) {
  return {
    schemaVersion: TELEMETRY_CONFIG.schemaVersion,
    exportedAt: now,
    units: { timestamp: 'unix_epoch_milliseconds', duration: 'milliseconds', percentage: '0_to_100' },
    definitions: {
      composition: '永久角色面數 / 全部骰子實際總面數 × 100；臨時貼紙另存於完整配置',
      rerolls: '每顆骰子每次實際重骰計一次；包含老師及連鎖，初擲與翻面除外',
      averageRerolls: '已結束戰鬥的重骰總數 / 已結束戰鬥場數；包含勝利與失敗',
      activeMs: '視窗聚焦且頁面可見的遊玩時間，包含演出與選擇',
      equipmentHeldMs: '持有裝備期間的前景遊玩時間',
      incomplete: '未記錄到通關、死亡或主動重新開始；最後保存後的遊玩資料可能尚未寫入',
      roundOutput: '正式提交結算時的總輸出；實際扣血與扣盾另列 damageHp / damageShield',
      bonusAttacks: '正式結算產生的追加與再攻擊數，包含擊殺後未造成實際損失的攻擊',
    },
    runs: structuredClone(runs.map((run) => ({ ...run, rerollSummary: rerollSummary(run.battles) }))),
  };
}

export function downloadRuns(runs: readonly RunRecord[]): void {
  const now = Date.now();
  const blob = new Blob([JSON.stringify(exportDocument(runs, now), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${TELEMETRY_CONFIG.exportPrefix}-${new Date(now).toISOString().replaceAll(':', '-')}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
