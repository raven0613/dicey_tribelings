import type { CreatureId } from '../../types/creatures';
import { getEffectiveFace } from '../../service/dice/diceFaces';
import React, { useLayoutEffect, useRef, useState } from 'react';
import type { Dice, StickerItem } from '../../types/game';
import { getDiceNet } from '../../service/dice/diceNet';
import { getDiceGeometry } from '../../service/dice/diceGeometry';
import { DiceNetFace } from './DiceNetFace';

interface DiceNetProps {
  dice: Dice;
  highlightCreature?: CreatureId;
  sticker?: StickerItem;
  onApplyFace?: (faceIndex: number) => void;
}

export const DiceNet: React.FC<DiceNetProps> = ({ dice, sticker, onApplyFace, highlightCreature }) => {
  const net = getDiceNet(dice.dieType);
  const geometry = getDiceGeometry(dice.dieType);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoveredFace, setHoveredFace] = useState<number | null>(null);
  const [focusedFace, setFocusedFace] = useState<number | null>(null);
  const [scale, setScale] = useState(180);
  const activeFace = hoveredFace ?? focusedFace;
  const neighbors = activeFace === null ? [] : geometry[activeFace].neighbors;

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
      const availableScale = Math.min((viewport.clientWidth - 12) / net.width,
        (viewport.clientHeight - 12) / net.height);
      setScale(Math.max(readableScale, availableScale));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    contents.forEach((content) => observer.observe(content));
    return () => observer.disconnect();
  }, [net]);

  const width = net.width * scale;
  const height = net.height * scale;

  return <section className="dice-net" aria-label={`${dice.name}展開圖`}>
    <div className="dice-net-status" aria-live="polite" aria-atomic="true">
      {activeFace === null
        ? sticker ? '移到骰面預覽覆蓋・點擊套用貼紙' : '移到骰面查看相鄰面・虛線為摺線'
        : `第 ${activeFace + 1} 面・相鄰面 ${neighbors.map((index) => index + 1).join('、')}`}
    </div>
    <div ref={viewportRef} className="dice-net-viewport">
      <div className="dice-net-stage" style={{ width: width + 12, height: height + 12 }}>
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
