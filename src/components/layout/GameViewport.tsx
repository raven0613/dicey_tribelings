import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { getGameViewport } from '../../service/layout/gameViewport';
import { GameViewportContext } from './GameViewportContext';
import { VIEWPORT_PRESENTATION } from '../../configs/viewportConfig';

export function GameViewport({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState(() => getGameViewport(window.innerWidth, window.innerHeight,
    window.matchMedia('(pointer: coarse)').matches));
  const context = useMemo(() => ({ ...viewport, overlay }), [viewport, overlay]);
  useLayoutEffect(() => {
    const element = viewportRef.current!;
    const pointer = window.matchMedia('(pointer: coarse)');
    const measure = () => {
      if (!element.clientWidth || !element.clientHeight) return;
      const next = getGameViewport(element.clientWidth, element.clientHeight, pointer.matches);
      setViewport((current) => current.width === next.width && current.height === next.height
        && current.scale === next.scale && current.mobile === next.mobile ? current : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    pointer.addEventListener('change', measure);
    measure();
    return () => { observer.disconnect(); pointer.removeEventListener('change', measure); };
  }, []);

  return <div className="game-viewport" ref={viewportRef}>
    <GameViewportContext.Provider value={context}>
      <div id="game-stage" className="game-stage" data-scale={viewport.scale} data-layout={viewport.mobile ? 'mobile' : 'desktop'} style={{
        width: viewport.width, height: viewport.height, transform: `scale(${viewport.scale})`,
        '--game-width': `${viewport.width}px`, '--game-height': `${viewport.height}px`,
        '--minimum-font-size': `${viewport.minimumFontSize}px`,
        '--ui-icon-size': `${VIEWPORT_PRESENTATION.inlineIconSizeEm}em`,
      } as CSSProperties}>
        {children}
        <div className="game-overlay-root" ref={setOverlay} />
      </div>
    </GameViewportContext.Provider>
  </div>;
}
