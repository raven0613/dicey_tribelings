import { useEffect, useId, useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { SkillText } from './SkillText';

export function useSkillTooltip(content: string) {
  const id = useId();
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
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
    setAnchor(event.currentTarget.getBoundingClientRect());
  const above = anchor && anchor.top >= window.innerHeight - anchor.bottom;
  const width = Math.min(320, window.innerWidth - 24);
  const tooltip = anchor && createPortal(<div id={id} role="tooltip" className="skill-tooltip"
    style={{ width, left: Math.max(12, Math.min(window.innerWidth - width - 12, anchor.left + anchor.width / 2 - width / 2)),
      ...(above ? { bottom: window.innerHeight - anchor.top + 10, maxHeight: anchor.top - 22 }
        : { top: anchor.bottom + 10, maxHeight: window.innerHeight - anchor.bottom - 22 }) }}>
    <SkillText text={content} />
  </div>, document.body);
  return {
    tooltip,
    tooltipProps: {
      'aria-describedby': anchor ? id : undefined,
      onMouseEnter: show, onMouseLeave: dismiss, onFocus: show, onBlur: dismiss,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => { if (event.key === 'Escape') dismiss(); },
    },
  };
}
