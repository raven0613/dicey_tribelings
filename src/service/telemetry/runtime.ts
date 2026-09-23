import type { StoreApi } from 'zustand';
import type { GameState } from '../../store/gameStore.types';
import { useTelemetryStore } from '../../store/telemetryStore';
import { TELEMETRY_CONFIG } from '../../configs/telemetryConfig';
import { telemetryDatabase } from './database';
import { RunRecorder } from './recorder';

/** Installed once at the browser entry point, outside React renders and game simulations. */
export function connectTelemetry(store: StoreApi<GameState>) {
  let recorder: RunRecorder | null = null;
  let saving = Promise.resolve();
  const isActive = () => document.visibilityState === 'visible' && document.hasFocus();
  const save = (create = false) => {
    if (!recorder) return;
    const copy = structuredClone(recorder.record);
    saving = saving.then(() => telemetryDatabase.save(copy, create)).then(() => {
      useTelemetryStore.getState().setStorageError(null);
    }).catch((error: unknown) => {
      useTelemetryStore.getState().setStorageError(error instanceof Error ? error.message : String(error));
    });
  };
  const platform = () => {
    const agent = navigator.userAgent;
    const os = /Macintosh|Mac OS X/.test(agent) ? 'macOS' : /Windows/.test(agent) ? 'Windows' : '其他';
    return `${agent.includes('Electron/') ? '桌面' : '網頁'} / ${os}`;
  };
  const unsubscribe = store.subscribe((state, previous) => {
    const now = Date.now();
    if (state.runId && state.runId !== previous.runId) {
      if (recorder?.record.endedAt === null) {
        recorder.finish('abandoned', previous, now);
        save();
      }
      recorder = new RunRecorder(state.runId, state, now, platform(), isActive());
      save(true);
    } else if (recorder?.observe(state, previous, now)) save();
  });
  const checkpoint = () => {
    if (!recorder || recorder.record.endedAt !== null) return;
    recorder.clock(Date.now(), isActive());
    save();
  };
  const pageHide = () => {
    if (!recorder || recorder.record.endedAt !== null) return;
    recorder.clock(Date.now(), false);
    save();
  };
  const interval = window.setInterval(checkpoint, TELEMETRY_CONFIG.checkpointMs);
  window.addEventListener('focus', checkpoint);
  window.addEventListener('blur', checkpoint);
  window.addEventListener('pagehide', pageHide);
  document.addEventListener('visibilitychange', checkpoint);
  return () => {
    checkpoint();
    unsubscribe();
    window.clearInterval(interval);
    window.removeEventListener('focus', checkpoint);
    window.removeEventListener('blur', checkpoint);
    window.removeEventListener('pagehide', pageHide);
    document.removeEventListener('visibilitychange', checkpoint);
  };
}
