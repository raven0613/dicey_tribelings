import { useMemo, useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BattleComboSummary } from '../../types/battle';
import { getHoverRelations, type HoverLink } from '../../service/battle/hoverRelations';
import { HOVER_PRESENTATION as timing } from '../../configs/skillPresentationConfig';
import { SkillText } from '../common/SkillText';

export interface HoverAnchor { id: string; x: number; y: number; size: number; abilities: string[] }

function HoverLoss({ value }: { value: number }) {
  const [lastValue, setLastValue] = useState(value);
  useLayoutEffect(() => { if (value > 0) setLastValue(value); }, [value]);
  return <span className={`hover-loss ${value > 0 ? 'is-active' : ''}`}
    style={{ color: timing.colors.robbery }}>−{lastValue}</span>;
}

export function DiceHoverOverlay({ anchors, hoveredId, summary, width }: {
  anchors: HoverAnchor[]; hoveredId: string | null; summary: BattleComboSummary | null; width: number;
}) {
  const relations = getHoverRelations(summary, hoveredId);
  // 穩定保留本輪全部線段，切換目標時 CSS 從當前透明度與長度接續補間。
  const allLinks = useMemo(() => {
    const links = new Map<string, HoverLink>();
    for (const item of [...(summary?.items ?? []), ...(summary?.bonusDice ?? []).map((die) => ({ diceId: die.id }))]) {
      for (const link of getHoverRelations(summary, item.diceId).links) links.set(link.id, link);
    }
    return [...links.values()];
  }, [summary]);
  const style = { '--hover-fade': `${timing.fadeMs}ms`, '--hover-line': `${timing.lineMs}ms`,
    '--hover-flow': `${timing.flowMs}ms`, '--hover-ease': timing.ease,
    '--hover-gold': timing.colors.support, '--hover-rise': `${timing.nameRise}px`,
    '--hover-line-width': timing.lineWidth, '--hover-glow-width': timing.glowWidth,
    '--hover-glow-blur': `${timing.glowBlur}px` } as CSSProperties;
  return <div className="dice-hover-layer" style={style} aria-hidden="true">
    <svg className="dice-hover-links">
      {allLinks.map((link) => {
        const source = anchors.find((item) => item.id === link.from), target = anchors.find((item) => item.id === link.to);
        if (!source || !target) return null;
        const active = relations.links.some((item) => item.id === link.id);
        const curved = link.kind !== 'adjacent';
        const y1 = source.y - (curved ? source.size * 0.4 : 0), y2 = target.y - (curved ? target.size * 0.55 : 0);
        const peak = Math.min(y1, y2) - Math.min(65, Math.abs(target.x - source.x) * 0.25 + 25);
        const path = curved ? `M ${source.x} ${y1} C ${source.x} ${peak}, ${target.x} ${peak}, ${target.x} ${y2}`
          : `M ${source.x} ${y1} L ${target.x} ${y2}`;
        return <g key={link.id} className={`hover-link ${link.kind === 'robbery' ? 'is-robbery' : ''} ${active ? 'is-active' : ''}`} style={{ color: link.color }}>
          <path className="hover-link-glow hover-link-stroke" d={path} pathLength={1} />
          <path className="hover-link-stroke" d={path} pathLength={1} />
          <path className="hover-link-flow" d={path} />
          {curved && <>
            <path className="hover-link-arrow" d={`M ${target.x - 5} ${y2 - 7} L ${target.x} ${y2} L ${target.x + 5} ${y2 - 7}`} /></>}
        </g>;
      })}
    </svg>
    {anchors.map((anchor) => {
      const highlighted = relations.diceIds.includes(anchor.id);
      const loss = relations.links.filter((link) => link.to === anchor.id).reduce((sum, link) => sum + link.loss, 0);
      return <div key={anchor.id} className="hover-die-marker" style={{ left: anchor.x, top: anchor.y, width: anchor.size, height: anchor.size }}>
        <span className={`hover-ally-frame ${highlighted ? 'is-active' : ''}`} />
        <HoverLoss value={loss} />
      </div>;
    })}
    {anchors.map((anchor) => <div key={`name:${anchor.id}`} className={`hover-ability ${hoveredId === anchor.id && anchor.abilities.length > 0 ? 'is-active' : ''}`}
      style={{ left: anchor.x, top: anchor.y - anchor.size / 2 - 12,
        '--name-min-x': `${8 - anchor.x}px`, '--name-max-x': `${width - anchor.x - 8}px` } as CSSProperties}>
      <span>{anchor.abilities.map((ability) => <span className="hover-ability-line" key={ability}><SkillText text={ability} /></span>)}</span>
    </div>)}
  </div>;
}
