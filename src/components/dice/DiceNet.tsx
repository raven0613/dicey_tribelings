import { isArrowFace } from '../../configs/directionalStickerConfig';
import { getArrowTarget } from '../../service/dice/directionalFaces';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { useGameViewport } from '../layout/GameViewportContext';
import type { CreatureId } from '../../types/creatures';
import { getEffectiveFace } from '../../service/dice/diceFaces';
import React, { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import type { Dice, FaceSticker } from '../../types/game';
import { getDiceNet } from '../../service/dice/diceNet';
import { DICE_NET_PRESENTATION as presentation } from '../../configs/diceNetPresentationConfig';
import { getDiceGeometry } from '../../service/dice/diceGeometry';
import { DiceNetFace } from './DiceNetFace';
import { DiceNetArrowLink } from './DiceNetArrowLink';

interface DiceNetProps {
  dice: Dice;
  highlightCreature?: CreatureId;
  sticker?: FaceSticker;
  placementError?: (faceIndex: number) => string | null;
  onApplyFace?: (faceIndex: number) => void;
  previewFaceIndex?: number | null;
  onPreviewFaceChange?: (faceIndex: number) => void;
  previewOnly?: boolean;
}

export const DiceNet: React.FC<DiceNetProps> = ({ dice, sticker, onApplyFace, highlightCreature, placementError,
  previewFaceIndex, onPreviewFaceChange, previewOnly }) => {
  const { minimumFontSize } = useGameViewport();
  const net = getDiceNet(dice.dieType);
  const geometry = getDiceGeometry(dice.dieType);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoveredFace, setHoveredFace] = useState<number | null>(null);
  const [focusedFace, setFocusedFace] = useState<number | null>(null);
  const [{ scale, contentScale }, setLayout] = useState({ scale: presentation.contentWidth / 2, contentScale: 1 });
  const activeFace = previewFaceIndex !== undefined ? previewFaceIndex : hoveredFace ?? focusedFace;
  const preview = (index: number | null, focus = false) => {
    if (onPreviewFaceChange) { if (index !== null) onPreviewFaceChange(index); }
    else if (focus) setFocusedFace(index);
    else setHoveredFace(index);
  };
  const activeRole = activeFace === null ? undefined : sticker?.creature ?? getEffectiveFace(dice.faces[activeFace]).creature;
  const arrowTarget = activeFace !== null && activeRole && isArrowFace(activeRole) && dice.dieType === 'd6'
    ? getArrowTarget(dice, activeFace, activeRole) : null;
  const arrowPreview = Boolean(activeRole && isArrowFace(activeRole));
  const error = activeFace === null ? null : placementError?.(activeFace);
  const invalidArrowTarget = arrowTarget !== null && isArrowFace(getEffectiveFace(dice.faces[arrowTarget]).creature);
  const destination = arrowTarget === null ? '' : `翻至第 ${arrowTarget + 1} 面・${CREATURE_CONFIG[getEffectiveFace(dice.faces[arrowTarget]).creature].name}`;
  const neighbors = activeFace === null || arrowPreview ? [] : geometry[activeFace].neighbors;

  useLayoutEffect(() => {
    const viewport: HTMLDivElement = viewportRef.current!;
    const canvas: HTMLDivElement = canvasRef.current!;
    const contents = Array.from(canvas.querySelectorAll<HTMLElement>('.dice-net-content'));
    // Both original and replacement copies occupy the same grid cell during measurement.
    const measure = () => {
      const readableScale = Math.max(...contents.map((element, index) => {
        const bounds = net.faces[index].contentBounds;
        return Math.max(element.offsetWidth / bounds.width, element.offsetHeight / bounds.height);
      }));
      const padding = presentation.canvasPadding * 2;
      const availableScale = Math.min((viewport.clientWidth - padding) / net.width,
        (viewport.clientHeight - padding) / net.height);
      const fontSize = Math.max(presentation.fontSize, minimumFontSize);
      const minimumContentScale = Math.max(presentation.minimumFontSize, minimumFontSize) / fontSize;
      const scale = Math.max(readableScale * minimumContentScale, availableScale);
      setLayout({ scale, contentScale: Math.min(1, scale / readableScale) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    contents.forEach((content) => observer.observe(content));
    return () => observer.disconnect();
  }, [net, sticker, minimumFontSize]);

  const width = net.width * scale;
  const height = net.height * scale;

  return <section className="dice-net" aria-label={`${dice.name}展開圖`} style={{
    '--net-padding': `${presentation.canvasPadding}px`,
    '--net-content-width': `${presentation.contentWidth}px`,
    '--net-description-gap': `${presentation.descriptionGap}px`,
    '--net-font-size': `${presentation.fontSize}px`,
    '--net-content-scale': contentScale,
  } as CSSProperties}>
    <div className="dice-net-status" aria-live="polite" aria-atomic="true">
      {activeFace === null
        ? sticker ? previewOnly ? '點骰面預覽，再按「貼到此面」' : '移到骰面預覽覆蓋・點擊套用貼紙' : '移到骰面查看相鄰面・虛線為摺線'
        : error ?? `第 ${activeFace + 1} 面・${destination || `相鄰面 ${neighbors.map((index) => index + 1).join('、')}`}`}
    </div>
    <div ref={viewportRef} className="dice-net-viewport">
      <div className="dice-net-stage" style={{ width: width + presentation.canvasPadding * 2, height: height + presentation.canvasPadding * 2 }}>
        <div ref={canvasRef} className="dice-net-canvas" style={{ width, height }}>
          <svg className="dice-net-outlines" width={width} height={height}
            viewBox={`0 0 ${net.width} ${net.height}`} aria-hidden="true">
            {net.faces.map((face, index) => <polygon key={index}
              className={index === arrowTarget ? invalidArrowTarget ? 'is-arrow-invalid' : 'is-arrow-target' : index === activeFace ? 'is-current' : neighbors.includes(index) ? 'is-neighbor' : ''}
              points={face.points.map((point) => point.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />)}
            {net.folds.map(([a, b], index) => <line key={index} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
              className="dice-net-fold" vectorEffect="non-scaling-stroke" />)}
          </svg>
          {net.faces.map((face, index) => <DiceNetFace key={dice.faces[index].id}
            matched={highlightCreature ? getEffectiveFace(dice.faces[index]).creature === highlightCreature : undefined}
            blockedReason={placementError?.(index)} arrowTarget={index === arrowTarget} invalidArrowTarget={invalidArrowTarget}
            face={dice.faces[index]} index={index} geometry={face} scale={scale}
            relation={index === activeFace ? 'current' : neighbors.includes(index) ? 'neighbor' : 'none'}
            neighbors={geometry[index].neighbors} onHover={preview} onFocus={(index) => preview(index, true)}
            sticker={sticker} previewing={activeFace === index}
            onPreviewSelect={previewOnly ? () => onPreviewFaceChange?.(index) : undefined}
            onApply={onApplyFace ? () => onApplyFace(index) : undefined} />)}
          {activeFace !== null && arrowTarget !== null && activeRole && isArrowFace(activeRole) &&
            <DiceNetArrowLink dice={dice} source={activeFace} target={arrowTarget} arrow={activeRole}
              scale={scale} invalid={invalidArrowTarget} />}
        </div>
      </div>
    </div>
  </section>;
};
