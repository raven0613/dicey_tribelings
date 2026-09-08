import { ceilDamage } from '../../service/battle/damageValue';
import type { CreatureId } from '../../types/creatures';
import React, { useId } from 'react';
import type { Dice } from '../../types/game';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { DICE_SHAPES } from '../../configs/dicePresentationConfig';
import { getEffectiveFace } from '../../service/dice/diceFaces';

interface BattleDieProps {
  dice: Dice;
  faceIndex: number;
  size: number;
  rotation: number;
  scale: number;
  rolling: boolean;
  unrolled: boolean;
  bulgeFilter?: string;
  value?: number;
  numberScale: number;
  effectiveCreature?: CreatureId;
  protectedDie: boolean;
  spinning: boolean;
  buffed: boolean;
  locked: boolean;
  canReroll: boolean;
  onReroll: () => void;
  onInspect: (id: string | null) => void;
}

export const BattleDie: React.FC<BattleDieProps> = ({ dice, faceIndex, size, rotation, scale,
  rolling, unrolled, bulgeFilter, value, numberScale, effectiveCreature, protectedDie, spinning, buffed, locked, canReroll, onReroll, onInspect }) => {
  const id = useId();
  const face = dice.faces[faceIndex];
  const effective = getEffectiveFace(face);
  const creature = CREATURE_CONFIG[effectiveCreature ?? effective.creature];
  const shape = DICE_SHAPES[dice.dieType];
  const shownValue = ceilDamage(rolling ? effective.baseValue : value ?? effective.baseValue);
  const accent = unrolled ? '#94a3b8' : creature.color;

  return <button type="button" disabled={unrolled}
    className={`battle-die ${unrolled ? 'is-unrolled' : ''} ${rolling ? 'is-rolling' : ''} ${buffed && locked ? 'is-buffed' : ''}`}
    onMouseEnter={unrolled ? undefined : () => onInspect(dice.id)} onMouseLeave={unrolled ? undefined : () => onInspect(null)}
    onFocus={unrolled ? undefined : () => onInspect(dice.id)} onBlur={unrolled ? undefined : () => onInspect(null)}
    onKeyDown={(event) => { if (event.key === 'Escape') onInspect(null); }} aria-describedby={unrolled ? undefined : 'dice-hover-information'}
    aria-label={unrolled ? `${dice.name}，尚未擲骰` : `${dice.name}，${creature.name} ${shownValue}${canReroll ? '，重骰' : ''}`}
    aria-disabled={!canReroll} onClick={() => { if (canReroll) onReroll(); }}
    style={{ width: size, height: size, '--die-accent': accent } as React.CSSProperties}>
    <span className="battle-die-shadow" />
    <svg viewBox="0 0 100 104" aria-hidden="true" className="battle-die-art"
      style={{ transform: `rotate(${rotation}deg) scale(${scale})` }}>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0.75" y2="1">
          <stop stopColor="#fff5d6" /><stop offset="0.48" stopColor={accent} /><stop offset="1" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0.3" y2="1">
          <stop stopColor="#fffdf4" /><stop offset="0.55" stopColor="#f1eadb" /><stop offset="1" stopColor="#c3bbab" />
        </linearGradient>
      </defs>
      <g className="die-bulge-body" filter={bulgeFilter}>
        <path d={shape.outline} fill="#151b26" stroke="#070d17" strokeWidth="3" transform="translate(0 5)" />
        <path className="battle-die-rim" d={shape.outline} fill={`url(#${id}-rim)`} stroke="#111827" strokeWidth="2" />
        <path d={shape.outline} fill={`url(#${id}-face)`} stroke="#fff8e3" strokeWidth="1.2" transform="translate(6 6) scale(.88)" />
        <path d={shape.facets} fill="none" stroke="#766e62" strokeOpacity="0.4" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      {unrolled ? <text x="50" y="61" textAnchor="middle" className="battle-die-value">?</text> : <>
        <text x="35" y="58" textAnchor="middle" className="battle-die-creature">{creature.emoji}</text>
        <text x="62" y="59" textAnchor="middle" style={{ fontSize: Math.min(29, 72 / String(shownValue).length), transform: `scale(${numberScale})`, transformOrigin: '62px 50px' }}
          className={`battle-die-value ${spinning ? 'is-spinning' : ''} ${buffed && locked ? 'is-boosted' : ''}`}>{shownValue}</text>
      </>}
      <text x="50" y="76" textAnchor="middle" className="battle-die-type">{dice.dieType.toUpperCase()}</text>
      {!unrolled && protectedDie && <text x="50" y="29" textAnchor="middle" fontSize="12">🛡</text>}
      {!unrolled && face.temporarySticker && <circle cx="50" cy="33" r="3" fill="#e11d48" stroke="#fff" strokeWidth="1.5" />}
    </svg>
  </button>;
};
