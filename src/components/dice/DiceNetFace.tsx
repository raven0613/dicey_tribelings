import { isArrowFace } from '../../configs/directionalStickerConfig';
import { DiceNetContent, getPreviewFace } from './DiceNetContent';
import { useSkillTooltip } from '../common/useSkillTooltip';
import { useGameViewport } from '../layout/GameViewportContext';
import { DICE_NET_PRESENTATION as presentation } from '../../configs/diceNetPresentationConfig';
import { materialStyle } from './MaterialBadge';
import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';
import React from 'react';
import type { DiceFace, FaceSticker } from '../../types/game';
import type { DiceNetFace as NetFace } from '../../service/dice/diceNet';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';

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

export const DiceNetFace: React.FC<DiceNetFaceProps> = ({ face, index, geometry, scale, relation, neighbors,
  onHover, onFocus, sticker, previewing, onApply, onPreviewSelect, matched, blockedReason, arrowTarget, invalidArrowTarget }) => {
  const { mobile, minimumFontSize } = useGameViewport();
  const showPreview = !!sticker && previewing;
  const effective = getPreviewFace(face, showPreview ? sticker : undefined);
  const creature = CREATURE_CONFIG[effective.creature];
  const { tooltip, tooltipProps, show } = useSkillTooltip(
    <DiceNetContent face={face} sticker={showPreview ? sticker : undefined} full />,
    { interactive: true, className: 'dice-net-tooltip' });
  const { bounds, contentBounds } = geometry;
  const polygon = geometry.points.map(([x, y]) =>
    `${(x - bounds.x) / bounds.width * 100}% ${(y - bounds.y) / bounds.height * 100}%`).join(',');
  const label = arrowTarget ? invalidArrowTarget ? '無法翻至箭頭' : '翻至此面' : relation === 'current' ? showPreview ? '覆蓋預覽' : '目前檢視' : relation === 'neighbor' ? '相鄰面' : '';

  const infoSize = Math.max(presentation.infoButtonSize, minimumFontSize * 2);
  return <><div className="dice-net-face-wrapper" style={{ left: bounds.x * scale, top: bounds.y * scale,
    width: bounds.width * scale, height: bounds.height * scale }}>
    <button {...tooltipProps} type="button" className={`dice-net-face is-${relation} ${matched ? 'is-match' : ''} ${arrowTarget ? invalidArrowTarget ? 'is-arrow-invalid' : 'is-arrow-target' : ''} ${blockedReason ? 'is-blocked' : ''}`} aria-disabled={Boolean(blockedReason) && !onPreviewSelect} data-material={effective.material}
    aria-label={`${matched ? '原面與待套用貼紙為相同土人。' : ''}第 ${index + 1} 面，${creature.name}${isArrowFace(effective.creature) ? '' : `，基礎攻擊力 ${effective.baseValue}`}。${creature.description} ${effective.material ? MATERIAL_CONFIG[effective.material].name : ''} 相鄰面：${neighbors.map((n) => n + 1).join('、')}。${blockedReason ?? (onPreviewSelect ? '點擊預覽此面。' : onApply ? '點擊套用貼紙。' : '')}`}
    onMouseEnter={event => { onHover(index); tooltipProps.onMouseEnter(event); }} onMouseLeave={() => { onHover(null); tooltipProps.onMouseLeave(); }}
    onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) { onFocus(index); tooltipProps.onFocus(event); } }}
    onBlur={() => { onFocus(null); tooltipProps.onBlur(); }}
    onClick={onPreviewSelect ?? (blockedReason ? undefined : onApply)}
    style={{ ...materialStyle(effective.material), width: '100%', height: '100%',
      clipPath: `polygon(${polygon})` }}>
    <span className="dice-net-content" style={{
      left: (contentBounds.x - bounds.x) * scale,
      top: (contentBounds.y - bounds.y) * scale,
      width: contentBounds.width * scale, height: contentBounds.height * scale,
    }}>
      <span className="dice-net-relation" style={{ paddingRight: mobile ? infoSize : undefined }}>{label}</span>
      {matched !== undefined && <span className="dice-net-match">{matched ? '原面：相同土人' : ''}</span>}
      <span className="dice-net-copies"><DiceNetContent face={face} sticker={showPreview ? sticker : undefined} /></span>
    </span>
  </button>
  {mobile && <button type="button" className="dice-net-info" aria-label={`第 ${index + 1} 面完整說明`}
    style={{ left: (contentBounds.x + contentBounds.width - bounds.x) * scale - infoSize,
      top: (contentBounds.y - bounds.y) * scale, width: infoSize, height: infoSize }}
    onClick={event => { event.stopPropagation(); show(event); }}>ⓘ</button>}
  </div>{tooltip}</>;
};
