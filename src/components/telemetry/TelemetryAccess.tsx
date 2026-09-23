import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { TELEMETRY_CONFIG } from '../../configs/telemetryConfig';
import { useGameViewport } from '../layout/GameViewportContext';
import { useStoryStore } from '../../store/storyStore';
import './telemetry.scss';

const TelemetryPanel = lazy(() => import('./TelemetryPanel'));

export function TelemetryAccess() {
  const [open, setOpen] = useState(false);
  const armed = useRef(false);
  const { scale } = useGameViewport();
  const storyOpen = useStoryStore((state) => state.queue.length > 0);
  const reveal = () => { armed.current = false; setOpen(true); };
  useEffect(() => {
    if (storyOpen) armed.current = false;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (open || storyOpen || event.repeat || event.isComposing || !event.shiftKey || event.ctrlKey || event.altKey || event.metaKey
        || event.code !== TELEMETRY_CONFIG.shortcutCode
        || (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select')))) return;
      event.preventDefault();
      armed.current = false;
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, storyOpen]);

  return <>
    <button type="button" className="telemetry-hotspot" aria-label="統計入口" tabIndex={-1}
      style={{ width: TELEMETRY_CONFIG.hotspotSizePx / scale, height: TELEMETRY_CONFIG.hotspotSizePx / scale }}
      onClick={() => { if (armed.current) reveal(); else armed.current = true; }} />
    {open && <Suspense fallback={null}><TelemetryPanel onClose={() => setOpen(false)} /></Suspense>}
  </>;
}
