import { isArrowFace } from '../../configs/directionalStickerConfig';
import { DiceCharacter } from './DiceCharacter';
import { MaterialBadge, materialStyle } from './MaterialBadge';
import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';
import { SkillText } from '../common/SkillText';
import React, { type CSSProperties } from 'react';
import type { DiceFace, FaceSticker } from '../../types/game';
import type { DiceNetFace as NetFace } from '../../service/dice/diceNet';
import { getEffectiveFace, getFaceTags } from '../../service/dice/diceFaces';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { DiceIdentityHeader } from './DiceIdentityHeader';

interface DiceNetFaceProps {
  face: DiceFace;
  matched?: boolean;
  blockedReason?: string | null;
  arrowTarget?: boolean;
  invalidArrowTarget?: boolean;
  index: number;
  geometry: NetFace;
  scale: number;
  relation: 'current' | 'neighbor' | 'none';
  neighbors: number[];
  onHover: (index: number | null) => void;
  onFocus: (index: number | null) => void;
  sticker?: FaceSticker;
  previewing: boolean;
  onApply?: () => void;
  onPreviewSelect?: () => void;
}

function previewFace(face: DiceFace, sticker?: FaceSticker) {
  if (!sticker) return getEffectiveFace(face);
  return getEffectiveFace(sticker.isDisposable === true
    ? { ...face, temporarySticker: { name: sticker.name, creature: sticker.creature, description: sticker.description } }
    : { id: face.id, creature: sticker.creature, baseValue: sticker.baseValue, material: sticker.material });
}

const FaceContent: React.FC<{ face: DiceFace; sticker?: FaceSticker }> = ({ face, sticker }) => {
  const original = getEffectiveFace(face);
  const effective = previewFace(face, sticker);
  const creature = CREATURE_CONFIG[effective.creature];
  if (isArrowFace(effective.creature)) return <svg className="dice-net-arrow" viewBox="0 0 100 100" aria-label={creature.name}>
    <DiceCharacter creature={effective.creature} animate={false} />
  </svg>;
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
  onHover, onFocus, sticker, previewing, onApply, onPreviewSelect, matched, blockedReason, arrowTarget, invalidArrowTarget }) => {
  const showPreview = !!sticker && previewing;
  const effective = previewFace(face, showPreview ? sticker : undefined);
  const creature = CREATURE_CONFIG[effective.creature];
  const { bounds, contentBounds } = geometry;
  const polygon = geometry.points.map(([x, y]) =>
    `${(x - bounds.x) / bounds.width * 100}% ${(y - bounds.y) / bounds.height * 100}%`).join(',');
  const label = arrowTarget ? invalidArrowTarget ? '無法翻至箭頭' : '翻至此面' : relation === 'current' ? showPreview ? '覆蓋預覽' : '目前檢視' : relation === 'neighbor' ? '相鄰面' : '';

  return <button type="button" className={`dice-net-face is-${relation} ${matched ? 'is-match' : ''} ${arrowTarget ? invalidArrowTarget ? 'is-arrow-invalid' : 'is-arrow-target' : ''} ${blockedReason ? 'is-blocked' : ''}`} aria-disabled={Boolean(blockedReason) && !onPreviewSelect} data-material={effective.material}
    aria-label={`${matched ? '原面與待套用貼紙為相同土人。' : ''}第 ${index + 1} 面，${creature.name}${isArrowFace(effective.creature) ? '' : `，基礎攻擊力 ${effective.baseValue}`}。${creature.description} ${effective.material ? MATERIAL_CONFIG[effective.material].name : ''} 相鄰面：${neighbors.map((n) => n + 1).join('、')}。${blockedReason ?? (onPreviewSelect ? '點擊預覽此面。' : onApply ? '點擊套用貼紙。' : '')}`}
    onMouseEnter={() => onHover(index)} onMouseLeave={() => onHover(null)}
    onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) onFocus(index); }}
    onBlur={() => onFocus(null)}
    onClick={onPreviewSelect ?? (blockedReason ? undefined : onApply)}
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
