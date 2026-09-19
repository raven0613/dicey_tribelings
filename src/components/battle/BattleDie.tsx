import { MaterialPaint } from '../dice/MaterialPaint';
import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';
import { ceilDamage } from '../../service/battle/damageValue';
import type { CreatureId, CreatureTag } from '../../types/creatures';
import React, { useId } from 'react';
import type { Dice } from '../../types/game';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { DICE_SHAPES, DICE_FACE_PRESENTATION as appearance } from '../../configs/dicePresentationConfig';
import { getEffectiveFace, getFaceTags } from '../../service/dice/diceFaces';
import { DiceFaceNumber } from '../dice/DiceFaceNumber';
import { DiceCharacter } from '../dice/DiceCharacter';
import { MaterialSheen } from '../dice/MaterialSheen';

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
  effectiveTags?: readonly CreatureTag[];
  reducedMotion?: boolean;
  protectedDie: boolean;
  spinning: boolean;
  buffed: boolean;
  locked: boolean;
  canReroll: boolean;
  onReroll: () => void;
  onInspect: (id: string | null) => void;
}

export const BattleDie: React.FC<BattleDieProps> = ({ dice, faceIndex, size, rotation, scale,
  rolling, unrolled, bulgeFilter, value, numberScale, effectiveCreature, effectiveTags, reducedMotion,
  protectedDie, spinning, buffed, locked, canReroll, onReroll, onInspect }) => {
  const id = useId();
  const face = dice.faces[faceIndex];
  const effective = getEffectiveFace(face);
  const creatureId = effectiveCreature ?? effective.creature;
  const creature = CREATURE_CONFIG[creatureId];
  const tags = effectiveTags ?? getFaceTags({ ...effective, creature: creatureId });
  const shape = DICE_SHAPES[dice.dieType];
  const shownValue = ceilDamage(rolling ? effective.baseValue : value ?? effective.baseValue);
  const material = unrolled ? undefined : face.material;
  const coating = material ? MATERIAL_CONFIG[material] : undefined;

  return <button type="button" disabled={unrolled} data-material={material}
    className={`battle-die ${unrolled ? 'is-unrolled' : ''} ${rolling ? 'is-rolling' : ''} ${buffed && locked ? 'is-buffed' : ''}`}
    onMouseEnter={unrolled ? undefined : () => onInspect(dice.id)} onMouseLeave={unrolled ? undefined : () => onInspect(null)}
    onFocus={unrolled ? undefined : () => onInspect(dice.id)} onBlur={unrolled ? undefined : () => onInspect(null)}
    onKeyDown={(event) => { if (event.key === 'Escape') onInspect(null); }} aria-describedby={unrolled ? undefined : 'dice-hover-information'}
    aria-label={unrolled ? `${dice.name}，尚未擲骰` : `${dice.name}，${creature.name} ${shownValue}${coating ? `，${coating.name}` : ''}${canReroll ? '，重骰' : ''}`}
    aria-disabled={!canReroll} onClick={() => { if (canReroll) onReroll(); }}
    style={{ width: size, height: size }}>
    <span className="battle-die-shadow" />
    <svg viewBox="0 0 100 100" aria-hidden="true" className="battle-die-art"
      style={{ transform: `rotate(${rotation}deg) scale(${scale})` }}>
      <defs>
        {material && <MaterialPaint material={material} id={`${id}-material`} />}
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0.75" y2="1">
          <stop stopColor={appearance.bodyColor} /><stop offset="1" stopColor={appearance.bevelShade} />
        </linearGradient>
      </defs>
      <g className="die-bulge-body" filter={bulgeFilter}>
        <rect className="battle-die-rim" x="1" y="1" width="98" height="98" rx={appearance.rimRadius}
          fill={`url(#${id}-rim)`} stroke={appearance.edgeColor} strokeWidth="2" />
        {/* <path className="battle-die-face" d={shape.outline} fill={appearance.bodyColor} /> */}
        <rect className="battle-die-face" x="7" y="7" width="86" height="86" rx="8" ry="8" fill="#ffffff" />
        <rect className="battle-die-sticker" x={appearance.stickerInset} y={appearance.stickerInset}
          width={100 - appearance.stickerInset * 2} height={100 - appearance.stickerInset * 2}
          rx={appearance.stickerRadius} fill={material ? `url(#${id}-material)` : appearance.stickerColor}
          stroke={appearance.stickerEdgeColor} strokeWidth={appearance.stickerEdgeWidth} />
        <path d={shape.facets} fill="none" stroke="#766e62" strokeOpacity="0.4" strokeWidth="1.4" strokeLinecap="round" />
        {!unrolled && <DiceCharacter creature={creatureId} rolling={rolling} reducedMotion={reducedMotion} />}
        {!unrolled && <MaterialSheen material={material} />}
      </g>
      <DiceFaceNumber value={unrolled ? '?' : shownValue} tags={unrolled ? ['common'] : tags}
        scale={numberScale} spinning={spinning} />
      {!unrolled && protectedDie && <text x="50" y="29" textAnchor="middle" fontSize="12">🛡</text>}
      {!unrolled && face.temporarySticker && <circle cx="50" cy="33" r="3" fill="#e11d48" stroke="#fff" strokeWidth="1.5" />}
    </svg>
  </button>;
};
