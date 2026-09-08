import { ceilDamage } from '../../service/battle/damageValue';
import { SkillFeedback } from './SkillFeedback';
import type { SkillFeedback as Feedback } from '../../types/battle';
import { BATTLE_PRESENTATION as timing } from '../../configs/battleConfig';
import React from 'react';
import { BonusAttackDice, AttackStage } from '../../types/game';
import { Sparkles } from 'lucide-react';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { CreatureBadge } from '../dice/CreatureBadge';

interface BonusPhantomDiceProps {
  dice: BonusAttackDice;
  sourceLabel: string;
  feedback: Feedback[];
  isAttacking: boolean;
  attackingStage: AttackStage;
  slotState?: {
    displayValue: number;
    scale: number;
    isSpinning: boolean;
    isLocked: boolean;
  };
  x: number;
  y: number;
  scale?: number;
  attackOffset: { x: number; y: number };
  onInspect: (id: string | null) => void;
}

export const BonusPhantomDice: React.FC<BonusPhantomDiceProps> = ({
  dice,
  sourceLabel,
  feedback,
  isAttacking,
  attackingStage,
  slotState,
  x,
  y,
  scale = 1,
  attackOffset,
  onInspect,
}) => {
  // Determine display number
  const displayNum = ceilDamage(slotState ? slotState.displayValue : dice.bonusDamage);
  const isSpinning = slotState?.isSpinning ?? false;
  const isLocked = slotState?.isLocked ?? false;

  const color = dice.creature ? CREATURE_CONFIG[dice.creature].color : '#d8b4fe';
  const renderCreatureIcon = () => dice.creature
    ? <CreatureBadge creature={dice.creature} iconOnly size={18} showTooltip={false} />
    : <Sparkles size={16} />;

  // Attack forward-dash motion calculations
  let transformStyle = 'translate(-50%, -50%)';
  let transitionStyle = 'none';

  if (isAttacking) {
    if (attackingStage === 'windup') {
      transformStyle = 'translate(-50%, calc(-50% + 12px)) scale(0.9)';
      transitionStyle = `transform ${timing.windupMs}ms ease-out`;
    } else if (attackingStage === 'dash') {
      transformStyle = `translate(calc(-50% + ${attackOffset.x}px), calc(-50% + ${attackOffset.y}px)) scale(1.45)`;
      transitionStyle = `transform ${timing.dashMs}ms cubic-bezier(0.1, 0.9, 0.2, 1.25)`;
    } else if (attackingStage === 'impact') {
      transformStyle = `translate(calc(-50% + ${attackOffset.x}px), calc(-50% + ${attackOffset.y}px)) scale(1.6)`;
      transitionStyle = `transform ${timing.recoilMs}ms ease-out`;
    } else if (attackingStage === 'recoil') {
      transformStyle = 'translate(-50%, -50%) scale(1)';
      transitionStyle = `transform ${timing.recoilMs}ms ease-out`;
    }
  }

  return (
    <div
      tabIndex={0} aria-label={`${sourceLabel}・${dice.label}`} aria-describedby="dice-hover-information"
      onMouseEnter={() => onInspect(dice.id)} onMouseLeave={() => onInspect(null)}
      onFocus={() => onInspect(dice.id)} onBlur={() => onInspect(null)}
      onKeyDown={(event) => { if (event.key === 'Escape') onInspect(null); }}
      id={`phantom-die-${dice.id}`}
      className={`phantom-die-anchor ${isAttacking ? 'is-attacking' : ''}`}
      style={{
        '--creature-color': color,
        color,
        left: `${x}px`,
        top: `${y}px`,
        transform: `${transformStyle} scale(${scale})`,
        transition: transitionStyle,
      } as React.CSSProperties}
    >
      <SkillFeedback diceId={dice.id} feedback={feedback} />
      {/* Radiant pedestal aura */}
      <div className="phantom-pedestal" />

      {/* Speed trail during dash */}
      {isAttacking && (attackingStage === 'dash' || attackingStage === 'impact') && (
        <div className="phantom-speed-trail" />
      )}

      {/* Impact shockwave ring */}
      {isAttacking && attackingStage === 'impact' && (
        <div className="phantom-impact-shockwave animate-ping" />
      )}

      {/* Only the outer spawn layer starts once; the stable cube keeps its six faces. */}
      <div className="phantom-spawn">
        <div className="phantom-float" style={{ animationPlayState: isAttacking ? 'paused' : 'running' }}>
          <div className="phantom-cube-container">
            {/* Front Face (Hero face showing slot machine number) */}
            <div className="phantom-face face-front">
              <div className="slot-number-box">
                {renderCreatureIcon()}
                <div style={{ transform: `scale(${slotState?.scale ?? 1})` }} className={`slot-number ${isSpinning ? 'spinning' : ''} ${isLocked ? 'locked' : ''}`}>
                  {displayNum}
                </div>
              </div>
            </div>

            {/* Back Face */}
            <div className="phantom-face face-back">
              <div className="slot-number-box">
                {renderCreatureIcon()}
                <div className="slot-number">{displayNum}</div>
              </div>
            </div>

            {/* Right Face */}
            <div className="phantom-face face-right">
              <div className="slot-number-box">
                {renderCreatureIcon()}
              </div>
            </div>

            {/* Left Face */}
            <div className="phantom-face face-left">
              <div className="slot-number-box">
                {renderCreatureIcon()}
              </div>
            </div>

            {/* Top Face */}
            <div className="phantom-face face-top">
              <div className="slot-number-box">
                <Sparkles style={{ width: '14px', height: '14px', opacity: 0.8 }} />
              </div>
            </div>

            {/* Bottom Face */}
            <div className="phantom-face face-bottom">
              <div className="slot-number-box" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
