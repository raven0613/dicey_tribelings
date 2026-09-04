import React from 'react';
import { BonusEquipmentDice, AttackStage } from '../../types/game';
import { Flame, Zap, Wind, Snowflake, Sparkles } from 'lucide-react';

interface BonusPhantomDiceProps {
  dice: BonusEquipmentDice;
  index: number;
  isAttacking: boolean;
  attackingStage: AttackStage;
  slotState?: {
    displayValue: number;
    isSpinning: boolean;
    isLocked: boolean;
  };
  x: number;
  y: number;
}

export const BonusPhantomDice: React.FC<BonusPhantomDiceProps> = ({
  dice,
  index,
  isAttacking,
  attackingStage,
  slotState,
  x,
  y,
}) => {
  // Determine display number
  const displayNum = slotState ? slotState.displayValue : dice.bonusDamage;
  const isSpinning = slotState?.isSpinning ?? false;
  const isLocked = slotState?.isLocked ?? false;

  // Element Icon
  const renderElementIcon = () => {
    const iconProps = { className: 'slot-icon', style: { width: '16px', height: '16px' } };
    switch (dice.element) {
      case 'fire':
        return <Flame {...iconProps} />;
      case 'thunder':
        return <Zap {...iconProps} />;
      case 'wind':
        return <Wind {...iconProps} />;
      case 'ice':
        return <Snowflake {...iconProps} />;
      default:
        return <Sparkles {...iconProps} />;
    }
  };

  // Attack forward-dash motion calculations
  let transformStyle = 'translate(-50%, -50%)';
  let transitionStyle = 'none';

  if (isAttacking) {
    if (attackingStage === 'windup') {
      transformStyle = 'translate(-50%, calc(-50% + 12px)) scale(0.9)';
      transitionStyle = 'transform 0.03s ease-out';
    } else if (attackingStage === 'dash') {
      transformStyle = 'translate(-50%, calc(-50% - 280px)) scale(1.45)';
      transitionStyle = 'transform 0.05s cubic-bezier(0.1, 0.9, 0.2, 1.25)';
    } else if (attackingStage === 'impact') {
      transformStyle = 'translate(-50%, calc(-50% - 290px)) scale(1.6)';
      transitionStyle = 'transform 0.035s ease-out';
    } else if (attackingStage === 'recoil') {
      transformStyle = 'translate(-50%, -50%) scale(1)';
      transitionStyle = 'transform 0.035s ease-out';
    }
  }

  const cubeAnimationClass = isSpinning
    ? 'slot-spinning'
    : isLocked
    ? 'slot-locked'
    : isAttacking
    ? ''
    : 'idle-float';

  return (
    <div
      id={`phantom-die-${dice.id}`}
      className={`phantom-die-anchor ${isAttacking ? 'is-attacking' : ''}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: transformStyle,
        transition: transitionStyle,
      }}
    >
      {/* Radiant pedestal aura */}
      <div className={`phantom-pedestal ${dice.element}`} />

      {/* Speed trail during dash */}
      {isAttacking && (attackingStage === 'dash' || attackingStage === 'impact') && (
        <div className={`phantom-speed-trail ${dice.element}`} />
      )}

      {/* Impact shockwave ring */}
      {isAttacking && attackingStage === 'impact' && (
        <div className={`phantom-impact-shockwave animate-ping border-${dice.element}`} />
      )}

      {/* 3D Translucent Cube */}
      <div className={`phantom-cube-container ${cubeAnimationClass}`}>
        {/* Front Face (Hero face showing slot machine number) */}
        <div className={`phantom-face face-front elem-${dice.element}`}>
          <div className="slot-number-box">
            {renderElementIcon()}
            <div className={`slot-number ${isSpinning ? 'spinning' : ''} ${isLocked ? 'locked' : ''}`}>
              {displayNum}
            </div>
          </div>
        </div>

        {/* Back Face */}
        <div className={`phantom-face face-back elem-${dice.element}`}>
          <div className="slot-number-box">
            {renderElementIcon()}
            <div className="slot-number">{dice.bonusDamage}</div>
          </div>
        </div>

        {/* Right Face */}
        <div className={`phantom-face face-right elem-${dice.element}`}>
          <div className="slot-number-box">
            {renderElementIcon()}
          </div>
        </div>

        {/* Left Face */}
        <div className={`phantom-face face-left elem-${dice.element}`}>
          <div className="slot-number-box">
            {renderElementIcon()}
          </div>
        </div>

        {/* Top Face */}
        <div className={`phantom-face face-top elem-${dice.element}`}>
          <div className="slot-number-box">
            <Sparkles style={{ width: '14px', height: '14px', opacity: 0.8 }} />
          </div>
        </div>

        {/* Bottom Face */}
        <div className={`phantom-face face-bottom elem-${dice.element}`}>
          <div className="slot-number-box" />
        </div>
      </div>

      {/* Source Equipment Tag Capsule */}
      <div className={`phantom-tag-capsule ${dice.element}`}>
        <span className="badge-sub">追加</span>
        <span>{dice.label}</span>
        <span>+{dice.bonusDamage}</span>
      </div>
    </div>
  );
};
