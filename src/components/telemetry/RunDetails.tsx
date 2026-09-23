import { useState } from 'react';
import type { RunRecord } from '../../service/telemetry/types';
import { RUN_RESULT_LABELS, SNAPSHOT_LABELS } from '../../configs/telemetryConfig';
import { BuildDetails } from './BuildDetails';
import { RunPerformance } from './RunPerformance';
import { RunHistory } from './RunHistory';
import { date, duration } from './format';

export function RunDetails({ run, onExport }: { run: RunRecord; onExport: () => void }) {
  const [tab, setTab] = useState<'build' | 'performance' | 'history'>('build');
  const [snapshotId, setSnapshotId] = useState<number | null>(null);
  const snapshot = run.snapshots.find((item) => item.id === snapshotId) ?? run.snapshots.at(-1);
  const inspect = (id: number) => { setSnapshotId(id); setTab('build'); };
  return <>
    <header className="telemetry-run-heading">
      <div><h3>{RUN_RESULT_LABELS[run.result]} · {run.location.regionName}</h3>
        <p>{date(run.startedAt)} · {run.platform}</p></div>
      <button type="button" onClick={onExport}>匯出這局 JSON</button>
    </header>
    <nav className="telemetry-tabs" aria-label="統計分類">
      <button type="button" aria-pressed={tab === 'build'} onClick={() => setTab('build')}>構築</button>
      <button type="button" aria-pressed={tab === 'performance'} onClick={() => setTab('performance')}>本局表現</button>
      <button type="button" aria-pressed={tab === 'history'} onClick={() => setTab('history')}>歷程</button>
    </nav>
    <div className="telemetry-tab-content">
      {tab === 'build' && snapshot && <>
        <label className="telemetry-snapshot-picker">檢視配置時點
          <select value={snapshot.id} onChange={(event) => setSnapshotId(Number(event.target.value))}>
            {[...run.snapshots].reverse().map((item) => <option key={item.id} value={item.id}>
              {SNAPSHOT_LABELS[item.reason]} · {item.location.title} · {duration(item.activeMs)}
            </option>)}
          </select>
        </label>
        <BuildDetails snapshot={snapshot} />
      </>}
      {tab === 'performance' && <RunPerformance run={run} onInspect={inspect} />}
      {tab === 'history' && <RunHistory run={run} onInspect={inspect} />}
    </div>
  </>;
}
