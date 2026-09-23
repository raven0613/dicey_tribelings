import { SNAPSHOT_LABELS } from '../../configs/telemetryConfig';
import type { RunRecord } from '../../service/telemetry/types';
import { duration } from './format';

export function RunHistory({ run, onInspect }: { run: RunRecord; onInspect: (id: number) => void }) {
  return <>
    <section className="telemetry-section"><h4>裝備持有歷程</h4>
      {run.equipmentHistory.length ? run.equipmentHistory.map((item, index) => <div className="telemetry-history-row" key={index}>
        <div><strong>{item.name}</strong><p>{item.source} · {item.acquiredLocation.regionName}／{item.acquiredLocation.title}</p>
          <p>持有 {duration(item.heldMs)} · 參與 {item.battles} 場戰鬥</p>
          <p className="telemetry-note">{item.removedLocation ? `於 ${item.removedLocation.regionName}／${item.removedLocation.title} 替換` : '最後紀錄時仍持有'}
            {item.replacementId && ` → ${run.equipmentHistory.find((held) => held.equipmentId === item.replacementId)?.name ?? item.replacementId}`}</p></div>
      </div>) : <p className="telemetry-note">尚未取得裝備</p>}
    </section>
    <section className="telemetry-section"><h4>配置時間線</h4>
      {[...run.snapshots].reverse().map((item) => <div className="telemetry-history-row" key={item.id}>
        <div><strong>{SNAPSHOT_LABELS[item.reason]}</strong><p>{item.location.regionName} · {item.location.title}</p>
          <small>前景 {duration(item.activeMs)} · {item.dice.length} 顆骰子 · {item.equipments.length} 件裝備</small></div>
        <button type="button" onClick={() => onInspect(item.id)}>查看配置</button>
      </div>)}
    </section>
    <section className="telemetry-section"><h4>行經路線</h4>
      {run.visits.map((visit, index) => <p className="telemetry-route-visit" key={index}>
        <span>{index + 1}</span>{visit.location.regionName} · {visit.location.title}
        <small>{duration(visit.activeMs)}</small></p>)}
    </section>
  </>;
}
