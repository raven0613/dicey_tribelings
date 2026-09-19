import { getPaidRerollCost } from '../../service/battle/rerollCost';
import { RerollPulse, useRerollFeedback } from './useRerollFeedback';
import { DieStatusBadge, RationsAllocation } from './BattleStatusBadges';
import { getActionTargets, getEquipmentAction } from '../../service/battle/rollService';
import { EQUIPMENT_ACTIONS } from '../../configs/equipment/equipmentActionConfig';
import { ceilDamage } from '../../service/battle/damageValue';
import { SkillFeedback } from './SkillFeedback';
import { DiceHoverOverlay } from './DiceHoverOverlay';
import { DiceHoverInfo, type DiceInspection } from './DiceHoverInfo';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getEffectiveFace, getFaceTags } from '../../service/dice/diceFaces';
import { DICE_TRAY_PRESENTATION } from '../../configs/dicePresentationConfig';
import { describeBattleSkills } from '../../service/battle/battleSkillDescription';
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { getAttackPose } from '../../service/battle/attackPresentation';
import { DiceBulgeFilter } from './DiceBulgeFilter';
import { useGameStore } from '../../store/gameStore';
import { BattleDie } from './BattleDie';
import { DiceAttackPortal } from './DiceAttackPortal';
import { getDiceTrayLayout, placeBonusDice } from '../../service/dice/diceTrayLayout';
import { BonusPhantomDice } from './BonusPhantomDice';
import {
  DiceRollAnimation,
  createDiceRollAnimation,
  stepDiceRollAnimation,
} from '../../service/dice/diceRollAnimation';
import { Dices, Sparkles } from 'lucide-react';
import { useDiceSize } from './useDiceSize';
import { DiceResultPanel } from './DiceResultPanel';

export const DiceBoard: React.FC = () => {
  const {
    dicePool,
    equipments,
    rolledIndices,
    combatPhase,
    currentEnemy, hoveredEquipmentId, control,
    activeRerollingIndex,
    finishRollAnimation,
    useControlReroll,
    finishRerollAnimation,
    comboSummary,
    attackingDieIndex,
    attackingBonusIndex,
    attackingStage,
    attackEmphasis,
    diceSlotStates,
    bonusSlotStates,
    visibleBonusIds, skillFeedback, displayedIdentities, displayedShields, displayedFood,
    diceAction, rerollAnimationId,
    creatureBattleState,
  } = useGameStore();
  const { feedback: rerollFeedback, finish: finishRerollFeedback } = useRerollFeedback(comboSummary, rerollAnimationId, combatPhase);
  const actionState = useGameStore.getState();
  const unrolled = combatPhase === 'PREPARATION';
  const actionTargets = getActionTargets(diceAction, actionState);
  const selectingAction = diceAction !== 'reroll' && combatPhase === 'CONTROL_PHASE';
  const hoveredAction = getEquipmentAction(equipments.find((item) => item.id === hoveredEquipmentId)?.ruleId ?? '');
  const highlightAction = selectingAction ? diceAction : hoveredAction?.action;
  const highlightedTargets = highlightAction ? getActionTargets(highlightAction, actionState) : [];
  const actionConfig = Object.values(EQUIPMENT_ACTIONS).find((item) => item.action === diceAction);
  let controlHint = '選擇裝備能力，或結算本輪';
  if (actionConfig) controlHint = `${actionConfig.prompt}・${actionConfig.cost} ${actionConfig.currency}`;
  else if (diceAction.startsWith('teacher:')) controlHint = '選擇基礎攻擊力最低的土人';
  else if (actionTargets.length) controlHint = control > 0 ? '點擊骰子重骰，每次花費 1 Control'
    : `點擊骰子重骰，每次花費 ${getPaidRerollCost(creatureBattleState.paidRerolls, equipments)} 金幣`;
  const reducedMotion = useReducedMotion() === true;
  const bulgeId = `dice-bulge-${useId()}`;
  const attackPose = getAttackPose(attackingStage, attackEmphasis, { x: 0, y: 0 }, reducedMotion);

  const diceSize = useDiceSize();
  const trayRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [traySize, setTraySize] = useState({ width: 640, height: 280 });
  const [attackTarget, setAttackTarget] = useState({ x: 0, y: 0 });
  const trayLayout = getDiceTrayLayout(traySize.width, dicePool, diceSize);
  const bonusPositions = placeBonusDice(comboSummary?.bonusDice ?? [], trayLayout.bonusPositions);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewportLeft, setViewportLeft] = useState(0);
  const rationsEquipment = equipments.find((equipment) => equipment.ruleId === 'RATIONS');
  const canShowRelations = combatPhase === 'CONTROL_PHASE' && activeRerollingIndex === null;
  const identities = dicePool.map((die, index) => {
    const effective = getEffectiveFace(die.faces[rolledIndices[index] ?? 0]);
    const displayed = combatPhase === 'PREPARATION' || combatPhase === 'ROLLING' || combatPhase === 'CONTROL_PHASE'
      ? undefined : displayedIdentities[die.id];
    const creature = displayed?.creature ?? effective.creature;
    return { creature, tags: displayed?.tags ?? getFaceTags(effective) };
  });
  const battleDescriptions = dicePool.map((die, index) => describeBattleSkills({
    die,
    faceIndex: rolledIndices[index] ?? 0, creature: identities[index].creature,
    summary: canShowRelations ? comboSummary : null, state: creatureBattleState
  }));
  const hoverAnchors = dicePool.map((die, index) => ({
    id: die.id, ...trayLayout.positions[index],
    size: trayLayout.size, abilities: battleDescriptions[index].abilities
  }));
  const shownBonusDice = (comboSummary?.bonusDice ?? []).filter((die) => visibleBonusIds.includes(die.id));
  for (const bonus of shownBonusDice) {
    const index = comboSummary!.bonusDice.indexOf(bonus);
    hoverAnchors.push({ id: bonus.id, ...bonusPositions[index], size: trayLayout.size, abilities: [bonus.label] });
  }
  const hoveredIndex = dicePool.findIndex((die) => die.id === hoveredId);
  const hoveredBonus = shownBonusDice.find((die) => die.id === hoveredId);
  let inspection: DiceInspection | null = null;
  if (!unrolled && hoveredIndex >= 0) {
    const identity = identities[hoveredIndex], creature = CREATURE_CONFIG[identity.creature];
    inspection = {
      ...identity, title: creature.name,
      description: battleDescriptions[hoveredIndex].description,
      material: dicePool[hoveredIndex].faces[rolledIndices[hoveredIndex] ?? 0].material
    };
  } else if (!unrolled && hoveredBonus) inspection = {
    creature: hoveredBonus.creature,
    title: `${hoveredBonus.sourceName}・${hoveredBonus.label}`, description: hoveredBonus.description
  };

  useLayoutEffect(() => {
    const tray: HTMLDivElement = viewportRef.current!;
    const measure = () => setTraySize({ width: tray.clientWidth, height: tray.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tray);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (combatPhase !== 'RESOLVING_ATTACK') return;
    const measure = () => {
      const enemy = document.getElementById('battle-enemy-target')!.getBoundingClientRect();
      const tray = trayRef.current!.getBoundingClientRect();
      setAttackTarget({ x: enemy.left + enemy.width / 2 - tray.left, y: enemy.top + enemy.height / 2 - tray.top });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
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
      const layout = getDiceTrayLayout(viewportRef.current!.clientWidth, dicePool, diceSize);
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

      const layout = getDiceTrayLayout(viewportRef.current!.clientWidth, dicePool, diceSize);
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
            finishRerollFeedback(dicePool[rIdx].id);
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
  }, [combatPhase, activeRerollingIndex, finishRollAnimation, finishRerollAnimation, finishRerollFeedback, dicePool]);

  return (
    <div
      className="battle-dice-content"
      onKeyDown={(event) => {
        if (selectingAction && event.key === 'Escape') actionState.setDiceAction('reroll');
      }}
    >
      <DiceBulgeFilter id={bulgeId} strength={attackPose.bulge} duration={attackPose.duration} />

      {/* 暫時隱藏，勿刪 */}
      {/* <div className="board-header">
        <Sparkles size={14} />
        <span>
          {combatPhase === 'PREPARATION' && '初始骰池已就位，按下擲骰開始'}
          {combatPhase === 'ROLLING' && '擲骰中…'}
          {combatPhase === 'CONTROL_PHASE' && controlHint}

          {combatPhase === 'RESOLVING_CALCULATION' && '技能結算中'}
          {combatPhase === 'RESOLVING_ATTACK' && '攻擊！'}
          {combatPhase === 'ENEMY_TURN' && '敵方行動中'}
          {combatPhase === 'VICTORY' && '戰鬥勝利！'}
        </span>
      </div> */}

      {/* Normal dice and additional attacks share the tray coordinate system. */}
      <div ref={viewportRef} className="dice-tray-viewport" onScroll={(event) => setViewportLeft(event.currentTarget.scrollLeft)}>
        <div ref={trayRef} className="dice-tray-area" style={{ width: trayLayout.width, height: trayLayout.height }}>
          <DiceHoverOverlay anchors={hoverAnchors} hoveredId={canShowRelations ? hoveredId ?? hoveredEquipmentId : null}
            summary={comboSummary} width={traySize.width} viewportLeft={viewportLeft} passiveEnabled={combatPhase === 'CONTROL_PHASE'}
            rolling={activeRerollingIndex !== null} roundKey={`${currentEnemy?.id}:${creatureBattleState.round}`}
            targetIds={canShowRelations ? highlightedTargets.flatMap((index) => highlightAction === 'swap' ? [dicePool[index].id, dicePool[index + 1].id] : [dicePool[index].id]) : []} />
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
            const available = actionTargets.includes(idx);
            const rationsStored = comboSummary?.events.filter((event) => rationsEquipment && event.equipmentId === rationsEquipment.id)
              .flatMap((event) => event.changes).filter((change) => change.kind === 'food' && change.targetId === die.id)
              .reduce((sum, change) => sum + change.after - change.before, 0) ?? 0;

            const isRerolling = activeRerollingIndex === idx || (combatPhase === 'ROLLING' && (!roll || !roll.isFinished));
            const isAttacking = combatPhase === 'RESOLVING_ATTACK' && attackingDieIndex === idx;

            const offsetX = attackTarget.x - trayLayout.positions[idx].x;
            const offsetY = attackTarget.y - trayLayout.positions[idx].y;
            const pose = getAttackPose(isAttacking ? attackingStage : 'idle', attackEmphasis,
              { x: offsetX, y: offsetY }, reducedMotion);
            const rotation = (unrolled ? 0 : roll?.rotation ?? 0) + pose.rotation;

            return (
              <DiceAttackPortal key={die.id} active={isAttacking} trayRef={trayRef}>
                <div
                  data-attack-die={idx}
                  className={`die-anchor ${resolving && pumpVal === 0 ? 'is-depleted' : ''} ${selectingAction ? available ? 'is-action-target' : 'is-not-action-target' : ''} ${isAttacking && attackEmphasis > 0 ? 'is-carry' : ''}`}
                  style={{
                    width: dieSize, height: dieSize,
                    '--detail-width': `${trayLayout.spacing - 8}px`,
                    '--attack-motion-duration': `${pose.duration}ms`,
                    '--attack-motion-easing': pose.easing,
                    left: trayLayout.positions[idx].x + (isRerolling && roll
                      ? (roll.x - roll.targetX) * diceSize / DICE_TRAY_PRESENTATION.size : 0),
                    top: trayLayout.positions[idx].y + (isRerolling && roll
                      ? (roll.y - roll.targetY - roll.height) * diceSize / DICE_TRAY_PRESENTATION.size : 0),
                    transform: pose.transform,
                    transition: pose.transition,
                    zIndex: isAttacking ? 100 : isRerolling ? 20 : 10,
                  } as React.CSSProperties}
                >
                  {!unrolled && combatPhase !== 'ROLLING' && (creatureBattleState.sealedDice?.includes(die.id)
                    ? <DieStatusBadge sealed /> : currentEnemy?.grapple?.diceId === die.id && !creatureBattleState.rerolledDice?.includes(die.id)
                      ? <DieStatusBadge damage={currentEnemy.grapple.damage} /> : null)}
                  <SkillFeedback diceId={die.id} feedback={skillFeedback} />
                  {combatPhase === 'CONTROL_PHASE' && !isRerolling && rerollFeedback?.diceIds.includes(die.id)
                    && <RerollPulse key={rerollFeedback.id} />}
                  {/* Dash Motion Speed Trail */}
                  {isAttacking && (attackingStage === 'dash' || attackingStage === 'impact') && (
                    <div className="speed-trail animate-pulse" />
                  )}

                  {/* Impact Shockwave Ring */}
                  {isAttacking && attackingStage === 'impact' && (
                    <div className="impact-shockwave animate-ping" />
                  )}

                  <BattleDie dice={die} size={dieSize} rotation={rotation} scale={unrolled ? 1 : roll?.scale ?? 1}
                    unrolled={unrolled} bulgeFilter={isAttacking && attackEmphasis > 0 && !reducedMotion ? `url(#${bulgeId})` : undefined}
                    faceIndex={isRerolling && roll ? roll.faceIndex : targetFaceIdx} rolling={isRerolling}
                    value={pumpVal} spinning={slotState?.isSpinning ?? false} locked={slotState?.isLocked ?? false} buffed={slotState?.isBuffed ?? false}
                    numberScale={slotState?.scale ?? 1} effectiveCreature={isRerolling ? undefined : identity}
                    effectiveTags={isRerolling ? undefined : identities[idx].tags} reducedMotion={reducedMotion}
                    protectedDie={creatureBattleState.lockedDice.includes(die.id)}
                    canReroll={combatPhase === 'CONTROL_PHASE' && available && activeRerollingIndex === null}
                    onReroll={() => useControlReroll(idx)} onInspect={setHoveredId} />

                  {calcItem && activeRerollingIndex === null && combatPhase !== 'ROLLING' && (
                    <DiceResultPanel labels={resultLabels}
                      allocation={combatPhase === 'CONTROL_PHASE' && rationsEquipment && rationsStored > 0
                        ? <RationsAllocation equipment={rationsEquipment} amount={rationsStored} /> : undefined} />
                  )}

                </div>
              </DiceAttackPortal>
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
              <DiceAttackPortal key={bDie.id} active={isAttacking} trayRef={trayRef}>
                <BonusPhantomDice
                  size={diceSize}
                  dice={bDie}
                  attackIndex={bIdx}
                  sourceLabel={sourceLabel}
                  feedback={skillFeedback}
                  isAttacking={isAttacking}
                  attackingStage={attackingStage}
                  attackEmphasis={attackEmphasis}
                  bulgeFilter={isAttacking && attackEmphasis > 0 && !reducedMotion ? `url(#${bulgeId})` : undefined}
                  reducedMotion={reducedMotion}
                  slotState={slotState}
                  x={position.x}
                  y={position.y}
                  attackOffset={{ x: attackTarget.x - position.x, y: attackTarget.y - position.y }}
                  onInspect={setHoveredId}
                />
              </DiceAttackPortal>
            );
          })}
        </div>

      </div>

      {/* Dice inspection beside the tray. */}
      <div className="board-info">
        <div className="info-left">
          <span>
            <Dices size={20} />
            <strong className="highlight">{dicePool.length}</strong>
          </span>
        </div>
        <DiceHoverInfo info={inspection} />
      </div>
    </div>
  );
};
