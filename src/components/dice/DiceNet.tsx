import type { CreatureId } from '../../types/creatures';
import { getEffectiveFace } from '../../service/dice/diceFaces';
import React, { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import type { Dice, StickerItem } from '../../types/game';
import { getDiceNet, type DiceNetOrientation } from '../../service/dice/diceNet';
import { DICE_NET_PRESENTATION as presentation } from '../../configs/diceNetPresentationConfig';
import { getDiceGeometry } from '../../service/dice/diceGeometry';
import { DiceNetFace } from './DiceNetFace';

interface DiceNetProps {
  dice: Dice;
  highlightCreature?: CreatureId;
  sticker?: StickerItem;
  onApplyFace?: (faceIndex: number) => void;
}

export const DiceNet: React.FC<DiceNetProps> = ({ dice, sticker, onApplyFace, highlightCreature }) => {
  const [orientation, setOrientation] = useState<DiceNetOrientation>('horizontal');
  const net = getDiceNet(dice.dieType, orientation);
  const geometry = getDiceGeometry(dice.dieType);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoveredFace, setHoveredFace] = useState<number | null>(null);
  const [focusedFace, setFocusedFace] = useState<number | null>(null);
  const [{ scale, contentScale }, setLayout] = useState({ scale: presentation.contentWidth / 2, contentScale: 1 });
  const activeFace = hoveredFace ?? focusedFace;
  const neighbors = activeFace === null ? [] : geometry[activeFace].neighbors;

  useLayoutEffect(() => {
    const mobile = window.matchMedia(`(max-width: ${presentation.mobileBreakpoint}px)`);
    const updateOrientation = () => setOrientation(mobile.matches ? 'vertical' : 'horizontal');
    updateOrientation();
    mobile.addEventListener('change', updateOrientation);
    return () => mobile.removeEventListener('change', updateOrientation);
  }, []);

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
      const scale = Math.max(readableScale * presentation.minimumFontSize / presentation.fontSize, availableScale);
      setLayout({ scale, contentScale: Math.min(1, scale / readableScale) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    contents.forEach((content) => observer.observe(content));
    return () => observer.disconnect();
  }, [net, sticker]);

  const width = net.width * scale;
  const height = net.height * scale;

  return <section className="dice-net" aria-label={`${dice.name}展開圖`} style={{
    '--net-padding': `${presentation.canvasPadding}px`,
    '--net-content-width': `${presentation.contentWidth}px`,
    '--net-font-size': `${presentation.fontSize}px`,
    '--net-content-scale': contentScale,
  } as CSSProperties}>
    <div className="dice-net-status" aria-live="polite" aria-atomic="true">
      {activeFace === null
        ? sticker ? '移到骰面預覽覆蓋・點擊套用貼紙' : '移到骰面查看相鄰面・虛線為摺線'
        : `第 ${activeFace + 1} 面・相鄰面 ${neighbors.map((index) => index + 1).join('、')}`}
    </div>
    <div ref={viewportRef} className="dice-net-viewport">
      <div className="dice-net-stage" style={{ width: width + presentation.canvasPadding * 2, height: height + presentation.canvasPadding * 2 }}>
        <div ref={canvasRef} className="dice-net-canvas" style={{ width, height }}>
          <svg className="dice-net-outlines" width={width} height={height}
            viewBox={`0 0 ${net.width} ${net.height}`} aria-hidden="true">
            {net.faces.map((face, index) => <polygon key={index}
              className={index === activeFace ? 'is-current' : neighbors.includes(index) ? 'is-neighbor' : ''}
              points={face.points.map((point) => point.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />)}
            {net.folds.map(([a, b], index) => <line key={index} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
              className="dice-net-fold" vectorEffect="non-scaling-stroke" />)}
          </svg>
          {net.faces.map((face, index) => <DiceNetFace key={dice.faces[index].id}
            matched={highlightCreature ? getEffectiveFace(dice.faces[index]).creature === highlightCreature : undefined}
            face={dice.faces[index]} index={index} geometry={face} scale={scale}
            relation={index === activeFace ? 'current' : neighbors.includes(index) ? 'neighbor' : 'none'}
            neighbors={geometry[index].neighbors} onHover={setHoveredFace} onFocus={setFocusedFace}
            sticker={sticker} previewing={hoveredFace === index || (hoveredFace === null && focusedFace === index)}
            onApply={onApplyFace ? () => onApplyFace(index) : undefined} />)}
        </div>
      </div>
    </div>
  </section>;
};
