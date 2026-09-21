import type { CSSProperties, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useGameViewport } from '../layout/GameViewportContext';

export interface SkillName {
  id: string;
  ability: ReactNode;
  changes: string;
  healing: boolean;
  style: CSSProperties;
}

export function SkillNameLayer({ rootRef, names }: {
  rootRef: RefObject<HTMLDivElement | null>;
  names: SkillName[];
}) {
  const { overlay } = useGameViewport();
  return overlay && names.length > 0 ? createPortal(<div ref={rootRef} className="skill-name-layer" aria-hidden="true">
    {names.map(({ id, ability, changes, healing, style }) => <span key={id} data-event-id={id}
      style={style} className={`skill-name ${healing ? 'is-healing' : ''}`}>
      <span className="skill-ability">{ability}</span>
      {changes && <span className="skill-change">{changes}</span>}
    </span>)}
  </div>, overlay) : null;
}
