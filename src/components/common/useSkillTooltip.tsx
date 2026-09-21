import { useGameViewport } from '../layout/GameViewportContext';
import { getGameRect } from '../../service/layout/gameViewport';
import { useEffect, useId, useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { SkillText } from './SkillText';

export function useSkillTooltip(content: string) {
  const viewport = useGameViewport();
  const id = useId();
  const [anchor, setAnchor] = useState<ReturnType<typeof getGameRect> | null>(null);
  const dismiss = () => setAnchor(null);
  useEffect(() => {
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, []);
  const show = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) =>
    setAnchor(getGameRect(event.currentTarget));
  const above = anchor && anchor.top >= viewport.height - anchor.bottom;
  const width = Math.min(320, viewport.width - 24);
  const tooltip = anchor && viewport.overlay && createPortal(<div id={id} role="tooltip" className="skill-tooltip"
    style={{ width, left: Math.max(12, Math.min(viewport.width - width - 12, anchor.left + anchor.width / 2 - width / 2)),
      ...(above ? { bottom: viewport.height - anchor.top + 10, maxHeight: anchor.top - 22 }
        : { top: anchor.bottom + 10, maxHeight: viewport.height - anchor.bottom - 22 }) }}>
    <SkillText text={content} />
  </div>, viewport.overlay);
  return {
    tooltip,
    tooltipProps: {
      'aria-describedby': anchor ? id : undefined,
      onMouseEnter: show, onMouseLeave: dismiss, onFocus: show, onBlur: dismiss,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => { if (event.key === 'Escape') dismiss(); },
    },
  };
}
