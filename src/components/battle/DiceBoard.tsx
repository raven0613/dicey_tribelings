import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Dice3D } from './Dice3D';
import { BonusPhantomDice } from './BonusPhantomDice';
import {
  DicePhysicsState,
  initDicePhysics,
  stepDicePhysics,
} from '../../service/physics/fakePhysicsEngine';
import { RotateCcw, Sparkles, Flame, Zap, Wind, Snowflake, AlertCircle } from 'lucide-react';

interface DiceBoardProps {
  currentStepIndex?: number;
}

export const DiceBoard: React.FC<DiceBoardProps> = ({ currentStepIndex = 0 }) => {
  const {
    dicePool,
    rolledIndices,
    combatPhase,
    control,
    activeRerollingIndex,
    finishRollPhysics,
    useControlReroll,
    finishRerollPhysics,
    comboSummary,
    attackingDieIndex,
    attackingBonusIndex,
    attackingStage,
    diceSlotStates,
    bonusSlotStates,
    showBonusDice,
  } = useGameStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [physicsStates, setPhysicsStates] = useState<DicePhysicsState[]>([]);
  const physicsStatesRef = useRef<DicePhysicsState[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const reqAnimRef = useRef<number | null>(null);
  const hasFinishedRollRef = useRef<boolean>(false);
  const hasFinishedRerollRef = useRef<boolean>(false);

  // When rolling starts, reset completion flag
  useEffect(() => {
    if (combatPhase === 'ROLLING') {
      hasFinishedRollRef.current = false;
    }
  }, [combatPhase]);

  // When active rerolling changes, reset reroll flag
  useEffect(() => {
    if (activeRerollingIndex !== null) {
      hasFinishedRerollRef.current = false;
    }
  }, [activeRerollingIndex]);

  // Initialize all dice when rolling starts
  useEffect(() => {
    if (combatPhase === 'ROLLING' && dicePool.length > 0 && rolledIndices.length === dicePool.length) {
      const containerWidth = containerRef.current?.clientWidth || 640;
      const containerHeight = containerRef.current?.clientHeight || 240;

      const inits = dicePool.map((die, idx) =>
        initDicePhysics(
          die.id,
          rolledIndices[idx] ?? 0,
          idx,
          dicePool.length,
          containerWidth,
          containerHeight,
          false
        )
      );
      physicsStatesRef.current = inits;
      setPhysicsStates(inits);
    }
  }, [combatPhase, dicePool, rolledIndices]);

  // Handle single die re-roll physics
  useEffect(() => {
    if (activeRerollingIndex !== null && rolledIndices[activeRerollingIndex] !== undefined) {
      const idx = activeRerollingIndex;
      const die = dicePool[idx];
      if (!die) return;

      const containerWidth = containerRef.current?.clientWidth || 640;
      const containerHeight = containerRef.current?.clientHeight || 240;

      const newPhysics = initDicePhysics(
        die.id,
        rolledIndices[idx],
        idx,
        dicePool.length,
        containerWidth,
        containerHeight,
        true
      );

      const next = [...physicsStatesRef.current];
      next[idx] = newPhysics;
      physicsStatesRef.current = next;
      setPhysicsStates(next);
    }
  }, [activeRerollingIndex, rolledIndices, dicePool]);

  // Animation frame physics step loop - side-effects executed cleanly outside state updaters
  useEffect(() => {
    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const currentStates = physicsStatesRef.current;
      if (currentStates.length > 0) {
        let anyRunning = false;
        let finishedRerollIdx: number | null = null;
        let shouldFinishRoll = false;

        const next = currentStates.map((state, idx) => {
          if (!state.isFinished) {
            anyRunning = true;
            const updated = stepDicePhysics(state, dt);
            if (updated.isFinished && activeRerollingIndex === idx) {
              finishedRerollIdx = idx;
            }
            return updated;
          }
          return state;
        });

        if (anyRunning) {
          physicsStatesRef.current = next;
          setPhysicsStates(next);
        } else if (combatPhase === 'ROLLING') {
          shouldFinishRoll = true;
        }

        // Trigger store callbacks outside react render/state reducer to prevent cross-component setState warnings
        if (finishedRerollIdx !== null && !hasFinishedRerollRef.current) {
          hasFinishedRerollRef.current = true;
          const rIdx = finishedRerollIdx;
          setTimeout(() => {
            finishRerollPhysics(rIdx);
          }, 0);
        }
        if (shouldFinishRoll && !hasFinishedRollRef.current) {
          hasFinishedRollRef.current = true;
          setTimeout(() => {
            finishRollPhysics();
          }, 0);
        }
      }

      reqAnimRef.current = requestAnimationFrame(loop);
    };

    reqAnimRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
    };
  }, [combatPhase, activeRerollingIndex, finishRollPhysics, finishRerollPhysics]);

  return (
    <div
      ref={containerRef}
      className="dice-board"
    >
      {/* Top Phase Header / Prompt */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fcd34d', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
            <Sparkles style={{ width: '14px', height: '14px' }} className="animate-spin" />
            {combatPhase === 'PREPARATION' && '戰前準備：配置本場戰術貼紙'}
            {combatPhase === 'ROLLING' && '骰子拋擲翻滾中 (0.8s)...'}
            {combatPhase === 'CONTROL_PHASE' && '戰術控制階段：檢視結果或花費 Control 重骰'}
            {combatPhase === 'RESOLVING_CALCULATION' && '裝備與組合數值跳動增幅中！'}
            {combatPhase === 'RESOLVING_ATTACK' && '骰子衝鋒衝刺撞擊敵人！'}
            {combatPhase === 'ENEMY_TURN' && '敵方行動中...'}
            {combatPhase === 'VICTORY' && '戰鬥勝利！'}
          </span>
        </div>

        {combatPhase === 'CONTROL_PHASE' && (
          <div style={{ color: '#94a3b8', fontWeight: 500 }}>
            點擊骰子下方 <span style={{ color: '#a5b4fc', fontWeight: 700 }}>重骰</span> 鈕可單顆重擲
          </div>
        )}
      </div>

      {/* Center 3D Physics Arena Display */}
      <div className="dice-tray-area">
        {dicePool.map((die, idx) => {
          const phys = physicsStates[idx];
          const targetFaceIdx = rolledIndices[idx] ?? 0;
          const calcItem = comboSummary?.items[idx];

          const slotState = diceSlotStates[idx];
          const isSlotSpinning = slotState?.isSpinning ?? false;
          const isSlotLocked = slotState?.isLocked ?? false;
          const isBuffed = slotState?.isBuffed ?? (calcItem ? calcItem.finalDamage > calcItem.baseValue : false);

          // Compute number pump value during resolution
          let pumpVal: number | undefined = undefined;
          if (slotState) {
            pumpVal = slotState.displayValue;
          } else if (combatPhase === 'RESOLVING_CALCULATION' && calcItem) {
            const steps = calcItem.stepValues;
            const stepIdx = Math.min(currentStepIndex, steps.length - 1);
            pumpVal = steps[stepIdx];
          } else if (combatPhase === 'RESOLVING_ATTACK' && calcItem) {
            pumpVal = calcItem.finalDamage;
          }

          let rotX = phys ? phys.rotX : 0;
          let rotY = phys ? phys.rotY : 0;
          let rotZ = phys ? phys.rotZ : 0;

          const isRerolling = activeRerollingIndex === idx || (combatPhase === 'ROLLING' && (!phys || !phys.isFinished));
          const isAttacking = combatPhase === 'RESOLVING_ATTACK' && attackingDieIndex === idx;

          let transformStyle = 'translate(-50%, -50%)';
          let transitionStyle = 'all 75ms ease-out';

          if (isAttacking) {
            if (attackingStage === 'windup') {
              transformStyle = 'translate(-50%, calc(-50% + 10px)) scale(0.92)';
              transitionStyle = 'transform 0.025s ease-out';
              rotX -= 25;
            } else if (attackingStage === 'dash') {
              transformStyle = 'translate(-50%, calc(-50% - 280px)) scale(1.45)';
              transitionStyle = 'transform 0.05s cubic-bezier(0.1, 0.9, 0.2, 1.25)';
              rotX += 50;
              rotZ += 18;
            } else if (attackingStage === 'impact') {
              transformStyle = 'translate(-50%, calc(-50% - 290px)) scale(1.55)';
              transitionStyle = 'transform 0.035s ease-out';
              rotX += 15;
            } else if (attackingStage === 'recoil') {
              transformStyle = 'translate(-50%, -50%) scale(1)';
              transitionStyle = 'transform 0.035s ease-out';
            }
          }

          return (
            <div
              key={die.id}
              className="die-anchor"
              style={{
                left: phys ? `${phys.x}px` : `${(idx + 1) * 110}px`,
                top: phys ? `${phys.y - (phys.z || 0)}px` : '50%',
                transform: transformStyle,
                transition: transitionStyle,
                zIndex: isAttacking ? 100 : isRerolling ? 20 : 10,
              }}
            >
              {/* Dash Motion Speed Trail */}
              {isAttacking && (attackingStage === 'dash' || attackingStage === 'impact') && (
                <div className="speed-trail animate-pulse" />
              )}

              {/* Impact Shockwave Ring */}
              {isAttacking && attackingStage === 'impact' && (
                <div className="impact-shockwave animate-ping" />
              )}

              {/* 3D Die Cube */}
              <Dice3D
                dice={die}
                rotX={rotX}
                rotY={rotY}
                rotZ={rotZ}
                size={70}
                isRerolling={isRerolling}
                highlightedFaceIndex={targetFaceIdx}
                pumpValue={pumpVal}
                isSpinning={isSlotSpinning}
                isLocked={isSlotLocked}
                isBuffed={isBuffed}
                onClick={() => {
                  if (combatPhase === 'CONTROL_PHASE' && control > 0 && activeRerollingIndex === null) {
                    useControlReroll(idx);
                  }
                }}
              />

              {/* Die Name & Re-roll Action Button in Control Phase */}
              {combatPhase === 'CONTROL_PHASE' && activeRerollingIndex === null && (
                <div className="die-action-group">
                  <span className="die-name-label">
                    {die.name.split(' ')[0]}
                  </span>
                  <button
                    id={`btn-reroll-die-${idx}`}
                    onClick={() => useControlReroll(idx)}
                    disabled={control <= 0}
                    className={`btn-reroll ${control > 0 ? 'active' : 'disabled'}`}
                  >
                    <RotateCcw style={{ width: '12px', height: '12px' }} />
                    <span>重骰 (-1)</span>
                  </button>
                </div>
              )}

              {/* Bonus tag badges shown under die during calculation */}
              {calcItem && (combatPhase === 'RESOLVING_CALCULATION' || (combatPhase === 'RESOLVING_ATTACK' && !isAttacking)) && (
                <div className="calc-tags-group">
                  {calcItem.bonusTags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="calc-tag animate-bounce"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Translucent Elemental Bonus Dice Generated from Equipment (Only revealed during settlement calculation & attack) */}
        {showBonusDice && comboSummary?.bonusDice?.map((bDie, bIdx) => {
          const containerWidth = containerRef.current?.clientWidth || 640;
          const containerHeight = containerRef.current?.clientHeight || 240;
          const totalBonus = comboSummary.bonusDice.length;

          // Find center coordinate of the rightmost regular die
          const lastPhys = physicsStates[dicePool.length - 1];
          const spacing = Math.min(100, (containerWidth - 80) / Math.max(1, dicePool.length));
          const defaultLastX = ((containerWidth - (dicePool.length - 1) * spacing) / 2) + (dicePool.length - 1) * spacing;
          const lastRegularCenterX = lastPhys ? lastPhys.x : defaultLastX;

          // Regular die half-width: 36px, Bonus die half-width: 38px.
          // Minimum center distance of 96px ensures >= 22px clear space, strictly NEVER covering the rightmost die!
          const minSafeX = lastRegularCenterX + 96;
          const neededSpaceOnRight = totalBonus * 88;
          const availableSpaceOnRight = containerWidth - (lastRegularCenterX + 38);

          let posX: number;
          let posY: number;

          if (availableSpaceOnRight >= neededSpaceOnRight + 16) {
            // Sits comfortably to the right of the rightmost die on the same level with clean clearance
            posX = minSafeX + bIdx * 88;
            posY = containerHeight * 0.48;
          } else {
            // In restricted viewport widths, place in elevated top-right tier to guarantee ZERO overlap
            const startUpperX = Math.max(minSafeX - 10, containerWidth - (totalBonus * 84 + 18));
            posX = startUpperX + bIdx * 84;
            posY = containerHeight * 0.22;
          }

          const isAttacking = attackingBonusIndex === bIdx;
          const slotState = bonusSlotStates[bDie.id];

          return (
            <BonusPhantomDice
              key={bDie.id}
              dice={bDie}
              index={bIdx}
              isAttacking={isAttacking}
              attackingStage={attackingStage}
              slotState={slotState}
              x={posX}
              y={posY}
            />
          );
        })}
      </div>

      {/* Bottom Tray Footer Information */}
      <div className="board-footer">
        <div className="footer-left">
          <span>
            當前骰池：<strong className="highlight">{dicePool.length}</strong> 顆骰子
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            剩餘 Control：
            <strong className="control-num">{control}</strong>
          </span>
        </div>
        <div className="footer-right">
          假物理碰撞與 3D 快速吸附已鎖定
        </div>
      </div>
    </div>
  );
};
