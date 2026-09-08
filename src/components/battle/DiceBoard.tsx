import { ceilDamage } from '../../service/battle/damageValue';
import { SkillFeedback } from './SkillFeedback';
import { PlayerImpact } from './PlayerImpact';
import { DiceHoverOverlay } from './DiceHoverOverlay';
import { DiceHoverInfo, type DiceInspection } from './DiceHoverInfo';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getEffectiveFace } from '../../service/dice/diceFaces';
import { DICE_TRAY_PRESENTATION } from '../../configs/dicePresentationConfig';
import { describeBattleSkills } from '../../service/battle/battleSkillDescription';
import { EQUIPMENT_BALANCE as eq, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { getOppositeFace, teacherTargets } from '../../service/battle/rollService';
import { BATTLE_PRESENTATION as timing } from '../../configs/battleConfig';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BattleDie } from './BattleDie';
import { getDiceTrayLayout, placeBonusDice } from '../../service/dice/diceTrayLayout';
import { BonusPhantomDice } from './BonusPhantomDice';
import {
  DiceRollAnimation,
  createDiceRollAnimation,
  stepDiceRollAnimation,
} from '../../service/dice/diceRollAnimation';
import { Sparkles } from 'lucide-react';

export const DiceBoard: React.FC = () => {
  const {
    dicePool,
    equipments,
    rolledIndices,
    combatPhase,
    control,
    activeRerollingIndex,
    finishRollAnimation,
    useControlReroll,
    finishRerollAnimation,
    comboSummary,
    attackingDieIndex,
    attackingBonusIndex,
    attackingStage,
    diceSlotStates,
    bonusSlotStates,
    visibleBonusIds, skillFeedback, displayedIdentities, displayedShields, displayedFood,
    diceAction, rerollAnimationId, gold,
    creatureBattleState,
    enemyAttack,
  } = useGameStore();
  const actionState = useGameStore.getState();

  const trayRef = useRef<HTMLDivElement>(null);
  const [traySize, setTraySize] = useState({ width: 640, height: 280 });
  const [attackTarget, setAttackTarget] = useState({ x: 0, y: 0 });
  const [detailsHeight, setDetailsHeight] = useState<number>(DICE_TRAY_PRESENTATION.detailsHeight);
  const trayLayout = getDiceTrayLayout(traySize.width, traySize.height, dicePool, detailsHeight);
  const bonusPositions = placeBonusDice(comboSummary?.bonusDice ?? [], trayLayout.bonusPositions);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const canShowRelations = combatPhase === 'CONTROL_PHASE' && activeRerollingIndex === null;
  const identities = dicePool.map((die, index) => {
    const effective = getEffectiveFace(die.faces[rolledIndices[index] ?? 0]);
    const displayed = combatPhase === 'PREPARATION' || combatPhase === 'ROLLING' || combatPhase === 'CONTROL_PHASE'
      ? undefined : displayedIdentities[die.id];
    const creature = displayed?.creature ?? effective.creature;
    return { creature, tags: displayed?.tags ?? [...CREATURE_CONFIG[creature].tags] };
  });
  const battleDescriptions = dicePool.map((die, index) => describeBattleSkills({ die,
    faceIndex: rolledIndices[index] ?? 0, creature: identities[index].creature,
    summary: canShowRelations ? comboSummary : null, state: creatureBattleState }));
  const hoverAnchors = dicePool.map((die, index) => ({ id: die.id, ...trayLayout.positions[index],
    size: trayLayout.size, abilities: battleDescriptions[index].abilities }));
  const shownBonusDice = (comboSummary?.bonusDice ?? []).filter((die) => visibleBonusIds.includes(die.id));
  for (const bonus of shownBonusDice) {
    const index = comboSummary!.bonusDice.indexOf(bonus);
    hoverAnchors.push({ id: bonus.id, ...bonusPositions[index], size: trayLayout.size, abilities: [bonus.label] });
  }
  useLayoutEffect(() => {
    const labels = [...trayRef.current!.querySelectorAll<HTMLElement>('.die-result-label')];
    const measure = () => setDetailsHeight(Math.max(DICE_TRAY_PRESENTATION.detailsHeight,
      ...labels.map((label) => label.offsetHeight + 8)));
    measure();
    const observer = new ResizeObserver(measure);
    labels.forEach((label) => observer.observe(label));
    return () => observer.disconnect();
  }, [comboSummary, combatPhase, activeRerollingIndex]);
  const hoveredIndex = dicePool.findIndex((die) => die.id === hoveredId);
  const hoveredBonus = shownBonusDice.find((die) => die.id === hoveredId);
  let inspection: DiceInspection | null = null;
  if (hoveredIndex >= 0) {
    const identity = identities[hoveredIndex], creature = CREATURE_CONFIG[identity.creature];
    inspection = { ...identity, title: creature.name,
      description: battleDescriptions[hoveredIndex].description };
  } else if (hoveredBonus) inspection = { creature: hoveredBonus.creature,
    title: `${hoveredBonus.sourceName}・${hoveredBonus.label}`, description: hoveredBonus.description };

  useLayoutEffect(() => {
    const tray: HTMLDivElement = trayRef.current!;
    const measure = () => setTraySize({ width: tray.clientWidth, height: tray.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tray);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (combatPhase !== 'RESOLVING_ATTACK') return;
    const enemy = document.getElementById('battle-enemy-target')!.getBoundingClientRect();
    const tray = trayRef.current!.getBoundingClientRect();
    setAttackTarget({ x: enemy.left + enemy.width / 2 - tray.left, y: enemy.top + enemy.height / 2 - tray.top });
  }, [combatPhase, attackingDieIndex, attackingBonusIndex, traySize.width, traySize.height]);

  const [rollStates, setRollStates] = useState<DiceRollAnimation[]>([]);
  const rollStatesRef = useRef<DiceRollAnimation[]>([]);
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
  }, [activeRerollingIndex, rerollAnimationId]);

  // Initialize all dice when rolling starts
  useEffect(() => {
    if (combatPhase === 'ROLLING' && dicePool.length > 0 && rolledIndices.length === dicePool.length) {
      const layout = getDiceTrayLayout(trayRef.current!.clientWidth, trayRef.current!.clientHeight, dicePool);
      const inits = dicePool.map((die, index) => createDiceRollAnimation(
        layout.positions[index].x, layout.positions[index].y, rolledIndices[index], die.faces.length));
      rollStatesRef.current = inits;
      setRollStates(inits);
    }
  }, [combatPhase, dicePool, rolledIndices, equipments]);

  // Handle single die re-roll animation
  useEffect(() => {
    if (activeRerollingIndex !== null && rolledIndices[activeRerollingIndex] !== undefined) {
      const idx = activeRerollingIndex;
      const die = dicePool[idx];
      if (!die) return;

      const layout = getDiceTrayLayout(trayRef.current!.clientWidth, trayRef.current!.clientHeight, dicePool);
      const newRoll = createDiceRollAnimation(layout.positions[idx].x, layout.positions[idx].y,
        rolledIndices[idx], die.faces.length, true);

      const next = [...rollStatesRef.current];
      next[idx] = newRoll;
      rollStatesRef.current = next;
      setRollStates(next);
    }
  }, [activeRerollingIndex, rerollAnimationId, rolledIndices, dicePool, equipments]);

  // Animation frame animation step loop - side-effects executed cleanly outside state updaters
  useEffect(() => {
    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const currentStates = rollStatesRef.current;
      if (currentStates.length > 0) {
        let anyRunning = false;
        let finishedRerollIdx: number | null = null;
        let shouldFinishRoll = false;

        const next = currentStates.map((state, idx) => {
          if (!state.isFinished) {
            anyRunning = true;
            const updated = stepDiceRollAnimation(state, dt);
            if (updated.isFinished && activeRerollingIndex === idx) {
              finishedRerollIdx = idx;
            }
            return updated;
          }
          return state;
        });

        if (anyRunning) {
          rollStatesRef.current = next;
          setRollStates(next);
        } else if (combatPhase === 'ROLLING') {
          shouldFinishRoll = true;
        }

        // Trigger store callbacks outside react render/state reducer to prevent cross-component setState warnings
        if (finishedRerollIdx !== null && !hasFinishedRerollRef.current) {
          hasFinishedRerollRef.current = true;
          const rIdx = finishedRerollIdx;
          setTimeout(() => {
            finishRerollAnimation(rIdx);
          }, 0);
        }
        if (shouldFinishRoll && !hasFinishedRollRef.current) {
          hasFinishedRollRef.current = true;
          setTimeout(() => {
            finishRollAnimation();
          }, 0);
        }
      }

      reqAnimRef.current = requestAnimationFrame(loop);
    };

    reqAnimRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
    };
  }, [combatPhase, activeRerollingIndex, finishRollAnimation, finishRerollAnimation]);

  return (
    <div
      id="battle-player-target"
      style={{ '--player-impact-duration': `${timing.enemyImpactMs + timing.enemyRecoilMs}ms` } as React.CSSProperties}
      className={`dice-board ${enemyAttack?.stage === 'impact' || enemyAttack?.stage === 'recoil' ? 'is-hit' : ''} ${enemyAttack?.heavy ? 'heavy-hit' : ''} ${enemyAttack && enemyAttack.healthDamage === 0 ? 'shield-hit' : ''}`}
    >
      <PlayerImpact />
      <div className="board-header">
        <Sparkles size={14} />
        <span>
          {combatPhase === 'PREPARATION' && '初始骰池已就位，按下擲骰開始'}
          {combatPhase === 'ROLLING' && '骰子拋擲翻滾中…'}
          {combatPhase === 'CONTROL_PHASE' && (diceAction === 'swap' ? '點擊左側骰子，與右側鄰骰交換' : diceAction === 'lock' ? '點擊骰子，本回合保護並提高基礎值' : diceAction === 'flip' ? '點擊有相對面的骰子進行翻面' : diceAction.startsWith('teacher:') ? '選擇基礎值最低的土人骰，發動老師' : control > 0 ? '點擊骰子重骰，每次花費 1 Control' : hasEquipment(equipments, 'COUNTERWEIGHT') ? `點擊骰子，花 ${eq.paidReroll} 金幣重骰` : '鎖定結果，結算本輪')}
          {combatPhase === 'RESOLVING_CALCULATION' && '角色技能連鎖結算中'}
          {combatPhase === 'RESOLVING_ATTACK' && '骰子衝鋒撞擊敵人！'}
          {combatPhase === 'ENEMY_TURN' && '敵方行動中…'}
          {combatPhase === 'VICTORY' && '戰鬥勝利！'}
        </span>
      </div>

      {/* Normal dice and additional attacks share the tray coordinate system. */}
      <div ref={trayRef} className="dice-tray-area">
        <DiceHoverOverlay anchors={hoverAnchors} hoveredId={canShowRelations ? hoveredId : null}
          summary={comboSummary} width={traySize.width} />
        {dicePool.map((die, idx) => {
          const roll = rollStates[idx];
          const targetFaceIdx = rolledIndices[idx] ?? 0;
          const calcItem = comboSummary?.items[idx];

          const slotState = diceSlotStates[idx];
          const storedFood = creatureBattleState.storedFood[die.id] ?? 0;
          const nextFood = calcItem ? comboSummary.nextStoredFood[die.id] ?? 0 : storedFood;
          const resolving = combatPhase === 'RESOLVING_CALCULATION' || combatPhase === 'RESOLVING_ATTACK';
          const resultLabels = calcItem && combatPhase === 'CONTROL_PHASE' ? [
            `攻擊 ${ceilDamage(calcItem.finalDamage)}`,
            calcItem.shieldGranted > 0 ? `護盾 ${calcItem.shieldGranted}` : '',
            storedFood > 0 || nextFood > 0 ? `儲糧 ${storedFood}→${nextFood}` : '',
          ].filter(Boolean) : resolving ? [
            (displayedShields[die.id]?.displayValue ?? 0) > 0 ? `護盾 ${displayedShields[die.id].displayValue}` : '',
            (displayedFood[die.id]?.displayValue ?? 0) > 0 ? `儲糧 ${displayedFood[die.id].displayValue}` : '',
          ].filter(Boolean) : [];
          const dieSize = trayLayout.size;
          const pumpVal = slotState?.displayValue;
          const identity = identities[idx].creature;
          const available = diceAction.startsWith('teacher:') ? teacherTargets(actionState, diceAction.slice(8)).includes(idx)
            : diceAction === 'swap' ? idx < dicePool.length - 1 && control >= eq.formationCost && !creatureBattleState.formationUsed
              : diceAction === 'lock' ? control >= eq.whistleCost && !creatureBattleState.whistleUsed
                : diceAction === 'flip' ? control >= eq.prismCost && getOppositeFace(die, targetFaceIdx) !== null
                  : control > 0 || (hasEquipment(equipments, 'COUNTERWEIGHT') && gold >= eq.paidReroll);

          let rotation = roll?.rotation ?? 0;

          const isRerolling = activeRerollingIndex === idx || (combatPhase === 'ROLLING' && (!roll || !roll.isFinished));
          const isAttacking = combatPhase === 'RESOLVING_ATTACK' && attackingDieIndex === idx;

          const offsetX = attackTarget.x - trayLayout.positions[idx].x;
          const offsetY = attackTarget.y - trayLayout.positions[idx].y;
          let transformStyle = 'translate(-50%, -50%)';
          let transitionStyle = 'none';

          if (isAttacking) {
            if (attackingStage === 'windup') {
              transformStyle = 'translate(-50%, calc(-50% + 10px)) scale(0.92)';
              transitionStyle = `transform ${timing.windupMs}ms ease-out`;
              rotation -= 12;
            } else if (attackingStage === 'dash') {
              transformStyle = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(1.45)`;
              transitionStyle = `transform ${timing.dashMs}ms cubic-bezier(0.1, 0.9, 0.2, 1.25)`;
              rotation += 18;
            } else if (attackingStage === 'impact') {
              transformStyle = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(1.55)`;
              transitionStyle = `transform ${timing.recoilMs}ms ease-out`;
              rotation += 8;
            } else if (attackingStage === 'recoil') {
              transformStyle = 'translate(-50%, -50%) scale(1)';
              transitionStyle = `transform ${timing.recoilMs}ms ease-out`;
            }
          }

          return (
            <div
              key={die.id}
              className={`die-anchor ${resolving && pumpVal === 0 ? 'is-depleted' : ''}`}
              style={{
                width: dieSize, height: dieSize,
                '--detail-width': `${trayLayout.spacing - 8}px`,
                left: roll && !roll.isFinished ? roll.x : trayLayout.positions[idx].x,
                top: roll && !roll.isFinished ? roll.y - roll.height : trayLayout.positions[idx].y,
                transform: transformStyle,
                transition: transitionStyle,
                zIndex: isAttacking ? 100 : isRerolling ? 20 : 10,
              } as React.CSSProperties}
            >
              <SkillFeedback diceId={die.id} feedback={skillFeedback} />
              {/* Dash Motion Speed Trail */}
              {isAttacking && (attackingStage === 'dash' || attackingStage === 'impact') && (
                <div className="speed-trail animate-pulse" />
              )}

              {/* Impact Shockwave Ring */}
              {isAttacking && attackingStage === 'impact' && (
                <div className="impact-shockwave animate-ping" />
              )}

              <BattleDie dice={die} size={dieSize} rotation={rotation} scale={roll?.scale ?? 1}
                faceIndex={isRerolling && roll ? roll.faceIndex : targetFaceIdx} rolling={isRerolling}
                value={pumpVal} spinning={slotState?.isSpinning ?? false} locked={slotState?.isLocked ?? false} buffed={slotState?.isBuffed ?? false}
                numberScale={slotState?.scale ?? 1} effectiveCreature={isRerolling ? undefined : identity}
                protectedDie={creatureBattleState.lockedDice.includes(die.id)}
                canReroll={combatPhase === 'CONTROL_PHASE' && available && activeRerollingIndex === null}
                onReroll={() => useControlReroll(idx)} onInspect={setHoveredId} />

              {calcItem && activeRerollingIndex === null && combatPhase !== 'ROLLING' && (
                <div className="die-result-label">
                  {resultLabels.map((label, index) => <span key={index}>{label}</span>)}
                </div>
              )}


            </div>
          );
        })}

        {comboSummary?.bonusDice?.map((bDie, bIdx) => {
          if (!visibleBonusIds.includes(bDie.id)) return null;
          const position = bonusPositions[bIdx];
          const source = bDie.source;
          const sourceLabel = source.kind === 'creature'
            ? dicePool.find((die) => die.id === source.diceId)!.name : bDie.sourceName;
          const isAttacking = attackingBonusIndex === bIdx;
          const slotState = bonusSlotStates[bDie.id];

          return (
            <BonusPhantomDice
              key={bDie.id}
              dice={bDie}
              sourceLabel={sourceLabel}
              feedback={skillFeedback}
              isAttacking={isAttacking}
              attackingStage={attackingStage}
              slotState={slotState}
              x={position.x}
              y={position.y}
              scale={trayLayout.phantomScale}
              attackOffset={{ x: attackTarget.x - position.x, y: attackTarget.y - position.y }}
              onInspect={setHoveredId}
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
        </div>
        <DiceHoverInfo info={inspection} />
      </div>
    </div>
  );
};
