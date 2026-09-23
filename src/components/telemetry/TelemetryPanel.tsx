import { liveQuery } from 'dexie';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { telemetryDatabase } from '../../service/telemetry/database';
import { downloadRuns } from '../../service/telemetry/export';
import { useTelemetryStore } from '../../store/telemetryStore';
import { RUN_RESULT_LABELS, TELEMETRY_CONFIG } from '../../configs/telemetryConfig';
import type { RunRecord } from '../../service/telemetry/types';
import { RunDetails } from './RunDetails';
import { date, duration } from './format';

export default function TelemetryPanel({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const storageError = useTelemetryStore((state) => state.storageError);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  useEffect(() => {
    const subscription = liveQuery(() => telemetryDatabase.list()).subscribe({
      next: (records) => { setRuns(records); setLoading(false); },
      error: (cause: unknown) => { setError(String(cause)); setLoading(false); },
    });
    return () => subscription.unsubscribe();
  }, []);
  const selected = runs.find((run) => run.id === selectedId) ?? runs[0];
  const selectedRuns = runs.filter((run) => checked.includes(run.id));
  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      await telemetryDatabase.remove(selectedRuns.map((run) => run.id));
      setChecked([]);
    } catch (cause) { setError(String(cause)); }
    finally { setDeleting(false); }
  };
  const exportRuns = (records: RunRecord[]) => {
    try { downloadRuns(records); }
    catch (cause) { setError(String(cause)); }
  };

  return createPortal(<dialog className="telemetry-panel" ref={dialog} aria-labelledby="telemetry-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="telemetry-header">
      <div><p className="telemetry-eyebrow">LOCAL RUN RECORDS</p><h2 id="telemetry-title">遊玩統計</h2>
        <p>本機保存最近 {TELEMETRY_CONFIG.maxRuns} 局 · 選取紀錄檢視配置與歷程</p></div>
      <button type="button" onClick={onClose} autoFocus aria-label="關閉統計">關閉 <small>Esc</small></button>
    </header>
    {(error || storageError) && <p className="telemetry-error" role="alert">資料處理失敗：{error || storageError}</p>}
    <div className="telemetry-body">
      <aside className="telemetry-sidebar" aria-label="歷史紀錄">
        <div className="telemetry-bulk">
          <label><input type="checkbox" checked={runs.length > 0 && selectedRuns.length === runs.length}
            disabled={!runs.length || deleting} onChange={(event) => setChecked(event.target.checked ? runs.map((run) => run.id) : [])} />全選</label>
          <span>{runs.length} / {TELEMETRY_CONFIG.maxRuns} 局</span>
          <button type="button" disabled={!selectedRuns.length} onClick={() => exportRuns(selectedRuns)}>匯出選取 ({selectedRuns.length})</button>
          <button type="button" className="telemetry-delete" disabled={!selectedRuns.length || deleting} onClick={() => void remove()}>
            {deleting ? '刪除中…' : '刪除選取'}</button>
        </div>
        <div className="telemetry-run-list">
          {runs.map((run) => <div key={run.id} className={`telemetry-run ${selected?.id === run.id ? 'is-selected' : ''}`}>
            <input type="checkbox" aria-label={`選取 ${date(run.startedAt)}`} checked={checked.includes(run.id)} disabled={deleting}
              onChange={(event) => setChecked((ids) => event.target.checked ? [...ids, run.id] : ids.filter((id) => id !== run.id))} />
            <button type="button" onClick={() => setSelectedId(run.id)} aria-pressed={selected?.id === run.id}>
              <span><strong>{RUN_RESULT_LABELS[run.result]}</strong><small>{duration(run.activeMs)}</small></span>
              <span>{run.location.regionName} · {run.location.title}</span><small>{date(run.startedAt)}</small>
            </button>
          </div>)}
          {!runs.length && <p className="telemetry-empty">{loading ? '讀取本機紀錄…' : '尚無遊玩紀錄。開始新局後會自動保存。'}</p>}
        </div>
      </aside>
      <section className="telemetry-detail">
        {selected ? <RunDetails key={selected.id} run={selected} onExport={() => exportRuns([selected])} />
          : <div className="telemetry-empty">每局的骰面組成、裝備與戰鬥歷程會顯示在這裡。</div>}
      </section>
    </div>
  </dialog>, document.body);
}
