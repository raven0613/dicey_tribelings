import { useGameViewport } from '../layout/GameViewportContext';
import { getGameRect } from '../../service/layout/gameViewport';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SkillText } from './SkillText';
import { SKILL_TOOLTIP_PRESENTATION as config } from '../../configs/skillTooltipConfig';

export function useSkillTooltip(content: ReactNode, options: { interactive?: boolean; className?: string } = {}) {
  const viewport = useGameViewport();
  const mobile = Boolean(options.interactive && viewport.mobile);
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<ReturnType<typeof getGameRect> | null>(null);
  const dismiss = () => setAnchor(null);
  useEffect(() => {
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => { window.removeEventListener('resize', dismiss); window.removeEventListener('scroll', dismiss, true); };
  }, []);
  useEffect(() => {
    if (!anchor) return;
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [anchor]);
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element || !anchor) return;
    const position = () => {
      const room = viewport.width - config.edge * 2;
      element.style.width = `${Math.min(mobile ? config.mobileWidth : config.width, room)}px`;
      if (element.offsetHeight > viewport.height - config.edge * 2) element.style.width = `${room}px`;
      const above = anchor.top >= viewport.height - anchor.bottom;
      const y = above ? anchor.top - element.offsetHeight - config.gap : anchor.bottom + config.gap;
      element.style.left = `${Math.max(config.edge, Math.min(viewport.width - element.offsetWidth - config.edge,
        anchor.left + anchor.width / 2 - element.offsetWidth / 2))}px`;
      element.style.top = `${Math.max(config.edge, Math.min(viewport.height - element.offsetHeight - config.edge, y))}px`;
      element.style.visibility = 'visible';
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(element);
    return () => observer.disconnect();
  }, [anchor, mobile, viewport.width, viewport.height, content]);
  const show = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => setAnchor(getGameRect(event.currentTarget));
  const tooltip = anchor && viewport.overlay && createPortal(<>
    {mobile && <div className="skill-tooltip-dismiss-layer" onPointerDown={event => event.stopPropagation()} onClick={event => { event.preventDefault(); event.stopPropagation(); dismiss(); }} />}
    <div ref={panel} id={id} role={mobile ? 'dialog' : 'tooltip'} aria-label={mobile ? '骰面完整說明' : undefined}
      className={`skill-tooltip ${options.className ?? ''} ${mobile ? 'is-interactive' : ''}`}
      style={{ visibility: 'hidden', padding: config.padding }} onClick={event => event.stopPropagation()}>
      {mobile && <button type="button" className="skill-tooltip-close" aria-label="關閉說明" onClick={dismiss}>×</button>}
      {typeof content === 'string' ? <SkillText text={content} /> : content}
    </div>
  </>, viewport.overlay);
  return { tooltip, show, dismiss, tooltipProps: {
    'aria-describedby': anchor ? id : undefined,
    onMouseEnter: (event: MouseEvent<HTMLElement>) => { if (!mobile) show(event); },
    onMouseLeave: () => { if (!mobile) dismiss(); },
    onFocus: (event: FocusEvent<HTMLElement>) => { if (!mobile) show(event); },
    onBlur: () => { if (!mobile) dismiss(); },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => { if (event.key === 'Escape') dismiss(); },
  } };
}
