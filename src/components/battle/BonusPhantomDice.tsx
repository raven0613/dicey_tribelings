import { useGameStore } from '../../store/gameStore';
import { ceilDamage } from '../../service/battle/damageValue';
import { SkillFeedback } from './SkillFeedback';
import type { SkillFeedback as Feedback } from '../../types/battle';
import { getAttackPose } from '../../service/battle/attackPresentation';
import React, { useEffect, useMemo, useState } from 'react';
import { BonusAttackDice, AttackStage } from '../../types/game';
import { Sparkles } from 'lucide-react';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { DiceCharacter } from '../dice/DiceCharacter';
import { DiceFaceNumber } from '../dice/DiceFaceNumber';
import { PHANTOM_DICE_PRESENTATION as config, DICE_FACE_PRESENTATION as faceConfig } from '../../configs/dicePresentationConfig';
import { getPhantomProjection } from '../../service/dice/phantomProjection';
import { DiceHoverInfo } from './DiceHoverInfo';

interface BonusPhantomDiceProps {
  size: number;
  dice: BonusAttackDice;
  attackIndex: number;
  sourceLabel: string;
  feedback: Feedback[];
  isAttacking: boolean;
  attackingStage: AttackStage;
  attackEmphasis: number;
  bulgeFilter?: string;
  reducedMotion: boolean;
  x: number;
  y: number;
  attackOffset: { x: number; y: number };
  onInspect: (id: string | null) => void;
  inspectionTarget: HTMLDivElement | null;
}

export const BonusPhantomDice: React.FC<BonusPhantomDiceProps> = ({
  size,
  dice,
  attackIndex,
  sourceLabel,
  feedback,
  isAttacking,
  attackingStage,
  attackEmphasis,
  bulgeFilter,
  reducedMotion,
  x,
  y,
  attackOffset,
  onInspect,
  inspectionTarget,
}) => {
  const slotState = useGameStore((state) => state.bonusSlotStates[dice.id]);
  const [spawned, setSpawned] = useState(false);
  useEffect(() => { if (isAttacking) setSpawned(true); }, [isAttacking]);
  // Determine display number
  const displayNum = ceilDamage(slotState ? slotState.displayValue : dice.bonusDamage);
  const isSpinning = slotState?.isSpinning ?? false;

  const color = dice.creature ? CREATURE_CONFIG[dice.creature].color : '#d8b4fe';
  const projection = useMemo(() => getPhantomProjection(size), [size]);
  const tags = dice.creature ? CREATURE_CONFIG[dice.creature].tags : ['mystery'] as const;
  // A lower bound for text scale after the front face is projected onto the screen.
  const numberUnitScale = (config.side - config.borderWidth * 2) / faceConfig.viewBoxSize * Math.min(projection.scaleX, projection.scaleY)
    * Math.cos(config.rotateX * Math.PI / 180) * Math.cos(config.rotateY * Math.PI / 180);
  const renderFace = () => <svg className="phantom-face-art" viewBox="0 0 100 100" aria-hidden="true">
    {dice.creature && <DiceCharacter creature={dice.creature} reducedMotion={reducedMotion} />}
    <DiceFaceNumber unitScale={numberUnitScale} value={displayNum} tags={tags} scale={slotState?.scale ?? 1} spinning={isSpinning} />
  </svg>;

  const pose = getAttackPose(isAttacking ? attackingStage : 'idle', attackEmphasis, attackOffset, reducedMotion);

  return (<>
    {inspectionTarget && <DiceHoverInfo target={inspectionTarget} info={{
      creature: dice.creature, tags, title: dice.label, attack: displayNum,
      source: `${dice.sourceName}・${dice.label}`, description: dice.description,
    }} />}
    <div
      data-attack-bonus={attackIndex}
      tabIndex={0} aria-label={`${sourceLabel}・${dice.label}`} aria-describedby="dice-hover-information"
      onMouseEnter={() => onInspect(dice.id)} onMouseLeave={() => onInspect(null)}
      onFocus={() => onInspect(dice.id)} onBlur={() => onInspect(null)}
      onKeyDown={(event) => { if (event.key === 'Escape') onInspect(null); }}
      id={`phantom-die-${dice.id}`}
      className={`phantom-die-anchor ${isAttacking ? 'is-attacking' : ''} ${isAttacking && attackEmphasis > 0 ? 'is-carry' : ''}`}
      style={{
        '--creature-color': color,
        '--phantom-side': `${config.side}px`,
        '--phantom-border-width': `${config.borderWidth}px`,
        '--phantom-depth': `${config.side / 2}px`,
        '--phantom-radius': `${config.cornerRadius}px`,
        '--phantom-rotate-x': `${config.rotateX}deg`,
        '--phantom-rotate-y': `${config.rotateY}deg`,
        '--phantom-float': `${config.floatDistance}px`,
        width: size, height: size,
        color,
        left: `${x}px`,
        top: `${y}px`,
        transform: `${pose.transform} rotate(${pose.rotation}deg)`,
        transition: pose.transition,
        zIndex: isAttacking ? 100 : undefined,
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
      <div className="phantom-distortion die-bulge-body" style={{ filter: bulgeFilter }}>
        <div className="phantom-projection" style={{ transform: `scale(${projection.scaleX}, ${projection.scaleY}) translate(${projection.offsetX}px, ${projection.offsetY}px)` }}>
          <div className="phantom-spawn" style={{ animationName: spawned || isAttacking ? 'none' : undefined }}
            onAnimationEnd={(event) => { if (event.target === event.currentTarget) setSpawned(true); }}>
            <div className="phantom-float" style={{ animationPlayState: isAttacking ? 'paused' : 'running' }}>
              <div className="phantom-cube-container">
                {/* Front Face (Hero face showing slot machine number) */}
                <div className="phantom-face face-front">
                  {renderFace()}
                </div>

                {/* Back Face */}
                <div className="phantom-face face-back">
                  {renderFace()}
                </div>

                {/* Right Face */}
                <div className="phantom-face face-right">
                  <div className="slot-number-box">
                    <Sparkles size={16} />
                  </div>
                </div>

                {/* Left Face */}
                <div className="phantom-face face-left">
                  <div className="slot-number-box">
                    <Sparkles size={16} />
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
      </div>
    </div></>
  );
};
