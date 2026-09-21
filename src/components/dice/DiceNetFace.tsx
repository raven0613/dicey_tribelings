import { MaterialBadge, materialStyle } from './MaterialBadge';
import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';
import { SkillText } from '../common/SkillText';
import React, { type CSSProperties } from 'react';
import type { DiceFace, StickerItem } from '../../types/game';
import type { DiceNetFace as NetFace } from '../../service/dice/diceNet';
import { getEffectiveFace, getFaceTags } from '../../service/dice/diceFaces';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { DiceIdentityHeader } from './DiceIdentityHeader';

interface DiceNetFaceProps {
  face: DiceFace;
  matched?: boolean;
  index: number;
  geometry: NetFace;
  scale: number;
  relation: 'current' | 'neighbor' | 'none';
  neighbors: number[];
  onHover: (index: number | null) => void;
  onFocus: (index: number | null) => void;
  sticker?: StickerItem;
  previewing: boolean;
  onApply?: () => void;
}

function previewFace(face: DiceFace, sticker?: StickerItem) {
  if (!sticker) return getEffectiveFace(face);
  return getEffectiveFace(sticker.isDisposable === true
    ? { ...face, temporarySticker: { name: sticker.name, creature: sticker.creature, description: sticker.description } }
    : { id: face.id, creature: sticker.creature, baseValue: sticker.baseValue, material: sticker.material });
}

const FaceContent: React.FC<{ face: DiceFace; sticker?: StickerItem }> = ({ face, sticker }) => {
  const original = getEffectiveFace(face);
  const effective = previewFace(face, sticker);
  const creature = CREATURE_CONFIG[effective.creature];
  const attack = sticker ? sticker.isDisposable === true ? `${effective.baseValue}（沿用）`
    : `${original.baseValue} → ${effective.baseValue}` : effective.baseValue;
  return <span className="dice-net-copy" style={{ '--face-color': creature.color } as CSSProperties}>
    <DiceIdentityHeader creature={effective.creature} title={creature.name} tags={getFaceTags(effective)} attack={attack} />
    <span className="dice-net-description">
      <span className="dice-net-ability"><strong><SkillText text={creature.ability} />：</strong><SkillText text={creature.description} /></span>
      <MaterialBadge material={effective.material} description />
      {!sticker && face.temporarySticker && <span className="dice-net-sticker">
        本場覆蓋・原面 {CREATURE_CONFIG[face.creature].name} {face.baseValue}
      </span>}
    </span>
  </span>;
};

export const DiceNetFace: React.FC<DiceNetFaceProps> = ({ face, index, geometry, scale, relation, neighbors,
  onHover, onFocus, sticker, previewing, onApply, matched }) => {
  const showPreview = !!sticker && previewing;
  const effective = previewFace(face, showPreview ? sticker : undefined);
  const creature = CREATURE_CONFIG[effective.creature];
  const { bounds, contentBounds } = geometry;
  const polygon = geometry.points.map(([x, y]) =>
    `${(x - bounds.x) / bounds.width * 100}% ${(y - bounds.y) / bounds.height * 100}%`).join(',');
  const label = relation === 'current' ? showPreview ? '覆蓋預覽' : '目前檢視' : relation === 'neighbor' ? '相鄰面' : '';

  return <button type="button" className={`dice-net-face is-${relation} ${matched ? 'is-match' : ''}`} data-material={effective.material}
    aria-label={`${matched ? '原面與待套用貼紙為相同土人。' : ''}第 ${index + 1} 面，${creature.name}，基礎攻擊力 ${effective.baseValue}。${creature.description} ${effective.material ? MATERIAL_CONFIG[effective.material].name : ''} 相鄰面：${neighbors.map((n) => n + 1).join('、')}。${onApply ? '點擊套用貼紙。' : ''}`}
    onMouseEnter={() => onHover(index)} onMouseLeave={() => onHover(null)}
    onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) onFocus(index); }}
    onBlur={() => onFocus(null)}
    onClick={onApply}
    style={{ ...materialStyle(effective.material), left: bounds.x * scale, top: bounds.y * scale,
      width: bounds.width * scale, height: bounds.height * scale,
      clipPath: `polygon(${polygon})` }}>
    <span className="dice-net-content" style={{
      left: (contentBounds.x + contentBounds.width / 2 - bounds.x) * scale,
      top: (contentBounds.y + contentBounds.height / 2 - bounds.y) * scale,
    }}>
      <span className="dice-net-relation">{label}</span>
      {matched !== undefined && <span className="dice-net-match">{matched ? '原面：相同土人' : ''}</span>}
      <span className="dice-net-copies">
        <span className={showPreview ? 'is-hidden' : ''} aria-hidden={showPreview}><FaceContent face={face} /></span>
        {sticker && <span className={showPreview ? '' : 'is-hidden'} aria-hidden={!showPreview}>
          <FaceContent face={face} sticker={sticker} />
        </span>}
      </span>
    </span>
  </button>;
};
