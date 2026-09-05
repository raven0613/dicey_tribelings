import React from 'react';
import { Dice, DiceFace, ElementType } from '../../types/game';
import { Circle, Flame, Snowflake, Sparkles, Wind, Zap } from 'lucide-react';

interface Dice3DProps {
  dice: Dice;
  rotX: number;
  rotY: number;
  rotZ: number;
  size?: number; // size in px, default 64
  isRerolling?: boolean;
  highlightedFaceIndex?: number;
  pumpValue?: number;
  isSpinning?: boolean;
  isLocked?: boolean;
  isBuffed?: boolean;
  onClick?: () => void;
}

const ELEMENT_ICONS: Record<ElementType, React.FC<{ className?: string }>> = {
  normal: Circle,
  fire: Flame,
  wind: Wind,
  thunder: Zap,
  ice: Snowflake,
};

export const Dice3D: React.FC<Dice3DProps> = ({
  dice,
  rotX,
  rotY,
  rotZ,
  size = 64,
  isRerolling = false,
  highlightedFaceIndex,
  pumpValue,
  isSpinning = false,
  isLocked = false,
  isBuffed = false,
  onClick,
}) => {
  const half = size / 2;

  // Face definitions with 3D transform orientations
  const faceTransforms = [
    `rotateY(0deg) translateZ(${half}px)`, // 0: Front
    `rotateY(180deg) translateZ(${half}px)`, // 1: Back
    `rotateY(90deg) translateZ(${half}px)`, // 2: Right
    `rotateY(-90deg) translateZ(${half}px)`, // 3: Left
    `rotateX(90deg) translateZ(${half}px)`, // 4: Top
    `rotateX(-90deg) translateZ(${half}px)`, // 5: Bottom
  ];

  const renderFaceContent = (face: DiceFace, index: number) => {
    const isOverridden = !!face.temporarySticker;
    const effectiveValue = isOverridden ? face.temporarySticker!.baseValue : face.baseValue;
    const effectiveElement = isOverridden ? face.temporarySticker!.element : face.element;
    const effectiveSpecial = isOverridden ? face.temporarySticker!.special : face.special;
    const ElementIcon = ELEMENT_ICONS[effectiveElement] || Circle;
    const isTargetFace = highlightedFaceIndex === index;
    const displayValue = isTargetFace && pumpValue !== undefined ? pumpValue : effectiveValue;

    const faceClass = [
      'dice-face',
      `elem-${effectiveElement}`,
      isTargetFace ? 'targeted' : '',
      isTargetFace && isBuffed && isLocked ? 'is-buffed-face' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const valueClass = [
      'face-main-value',
      isTargetFace && isSpinning ? 'slot-spinning' : '',
      isTargetFace && isLocked ? 'slot-locked' : '',
      isTargetFace && isBuffed ? 'is-buffed' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={faceClass}>
        {/* Buff Expanding Golden Ring */}
        {isTargetFace && isBuffed && isLocked && (
          <div className="face-buff-ring" />
        )}

        {/* Top Mini Element Icon & Sticker Tag */}
        <div className="face-top-row">
          <span className="elem-tag">
            <ElementIcon style={{ width: '10px', height: '10px' }} />
            <span>{effectiveElement === 'normal' ? '普' : effectiveElement[0]}</span>
          </span>
          {isOverridden && (
            <span className="disposable-badge animate-pulse">
              本場
            </span>
          )}
          {effectiveSpecial && effectiveSpecial !== 'none' && !isOverridden && (
            <span className="special-badge">
              {effectiveSpecial}
            </span>
          )}
          {isTargetFace && isBuffed && isLocked && (
            <Sparkles style={{ width: '10px', height: '10px', color: '#fde047' }} className="animate-spin" />
          )}
        </div>

        {/* Center Main Value */}
        <div className={valueClass}>
          {displayValue}
        </div>

        {/* Bottom Corner Accent Dots */}
        <div className="face-bottom-dots">
          <span className="dot" />
          <span className="dot" />
        </div>

      </div>
    );
  };

  return (
    <div
      className={`dice-3d-wrapper ${isRerolling ? 'rerolling' : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        perspective: '800px',
      }}
      onClick={onClick}
    >
      {/* 3D Cube wrapper */}
      <div
        className="dice-cube preserve-3d"
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
          transition: isRerolling ? 'none' : 'transform 0.04s linear',
        }}
      >
        {faceTransforms.map((transform, idx) => {
          const face = dice.faces[idx] || dice.faces[0];
          return (
            <div
              key={idx}
              className="dice-face-container preserve-3d backface-hidden"
              style={{
                transform,
              }}
            >
              {renderFaceContent(face, idx)}
            </div>
          );
        })}
      </div>

      {/* Ground Shadow underneath */}
      <div
        className="ground-shadow"
        style={{
          transform: `translateX(-50%) scale(${isRerolling ? 0.7 : 1})`,
          opacity: isRerolling ? 0.3 : 0.7,
        }}
      />
    </div>
  );
};
