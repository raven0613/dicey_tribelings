import { useShallow } from 'zustand/react/shallow';
import { BattleDiceSlot } from './BattleDiceSlot';
import { getPaidRerollCost } from '../../service/battle/rerollCost';
import { useRerollFeedback } from './useRerollFeedback';
import { getActionTargets, getEquipmentAction } from '../../service/battle/rollService';
import { EQUIPMENT_ACTIONS } from '../../configs/equipment/equipmentActionConfig';
import { DiceHoverOverlay } from './DiceHoverOverlay';
import { DiceHoverInfo, type DiceInspection } from './DiceHoverInfo';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getEffectiveFace, getFaceTags } from '../../service/dice/diceFaces';
import { describeBattleSkills } from '../../service/battle/battleSkillDescription';
import React, { useCallback, useMemo, useId, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { getAttackPose } from '../../service/battle/attackPresentation';
import { DiceBulgeFilter } from './DiceBulgeFilter';
import { useGameStore } from '../../store/gameStore';
import { DiceAttackPortal } from './DiceAttackPortal';
import { getDiceTrayLayout, placeBonusDice } from '../../service/dice/diceTrayLayout';
import { BonusPhantomDice } from './BonusPhantomDice';
import { Dices, Sparkles } from 'lucide-react';
import { useDiceSize } from './useDiceSize';

export const DiceBoard: React.FC = () => {
  const actionState = useGameStore(useShallow((state) => ({
    dicePool: state.dicePool,
    equipments: state.equipments,
    rolledIndices: state.rolledIndices,
    combatPhase: state.combatPhase,
    currentEnemy: state.currentEnemy,
    hoveredEquipmentId: state.hoveredEquipmentId,
    control: state.control,
    gold: state.gold,
    maxControl: state.maxControl,
    activeRerollingIndex: state.activeRerollingIndex,
    finishRollAnimation: state.finishRollAnimation,
    finishRerollAnimation: state.finishRerollAnimation,
    comboSummary: state.comboSummary,
    attackingDieIndex: state.attackingDieIndex,
    attackingBonusIndex: state.attackingBonusIndex,
    attackingStage: state.attackingStage,
    attackEmphasis: state.attackEmphasis,
    visibleBonusIds: state.visibleBonusIds,
    skillFeedback: state.skillFeedback,
    displayedIdentities: state.displayedIdentities,
    diceAction: state.diceAction,
    setDiceAction: state.setDiceAction,
    rerollAnimationId: state.rerollAnimationId,
    creatureBattleState: state.creatureBattleState,
  })));
  const {
    dicePool,
    equipments,
    rolledIndices,
    combatPhase,
    currentEnemy, hoveredEquipmentId, control,
    activeRerollingIndex,
    finishRollAnimation,
    finishRerollAnimation,
    comboSummary,
    attackingDieIndex,
    attackingBonusIndex,
    attackingStage,
    attackEmphasis,
    visibleBonusIds, skillFeedback, displayedIdentities,
    diceAction, rerollAnimationId,
    creatureBattleState,
  } = actionState;
  const { feedback: rerollFeedback, finish: finishRerollFeedback } = useRerollFeedback(comboSummary, rerollAnimationId, combatPhase);
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
  const trayLayout = useMemo(() => getDiceTrayLayout(traySize.width, dicePool, diceSize), [traySize.width, dicePool, diceSize]);
  const bonusPositions = useMemo(() => placeBonusDice(comboSummary?.bonusDice ?? [], trayLayout.bonusPositions), [comboSummary, trayLayout]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewportLeft, setViewportLeft] = useState(0);
  const canShowRelations = combatPhase === 'CONTROL_PHASE' && activeRerollingIndex === null;
  const identities = useMemo(() => dicePool.map((die, index) => {
    const effective = getEffectiveFace(die.faces[rolledIndices[index] ?? 0]);
    const displayed = combatPhase === 'PREPARATION' || combatPhase === 'ROLLING' || combatPhase === 'CONTROL_PHASE'
      ? undefined : displayedIdentities[die.id];
    const creature = displayed?.creature ?? effective.creature;
    return { creature, tags: displayed?.tags ?? getFaceTags(effective) };
  }), [dicePool, rolledIndices, combatPhase, displayedIdentities]);
  const battleDescriptions = useMemo(() => dicePool.map((die, index) => describeBattleSkills({
    die,
    faceIndex: rolledIndices[index] ?? 0, creature: identities[index].creature,
    summary: canShowRelations ? comboSummary : null, state: creatureBattleState
  })), [dicePool, rolledIndices, identities, canShowRelations, comboSummary, creatureBattleState]);
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
    const measure = () => {
      const width = tray.clientWidth, height = tray.clientHeight;
      setTraySize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    };
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

  const completedRolls = useRef(new Set<number>());
  useLayoutEffect(() => { completedRolls.current.clear(); }, [combatPhase]);
  const finishDieRoll = useCallback((index: number, reroll: boolean) => {
    if (reroll) {
      finishRerollFeedback(dicePool[index].id);
      finishRerollAnimation(index);
    } else {
      completedRolls.current.add(index);
      if (completedRolls.current.size === dicePool.length) finishRollAnimation();
    }
  }, [dicePool, finishRollAnimation, finishRerollAnimation, finishRerollFeedback]);

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
            return <BattleDiceSlot key={die.id} die={die} idx={idx} position={trayLayout.positions[idx]}
              size={trayLayout.size} spacing={trayLayout.spacing} attackTarget={attackTarget}
              identity={identities[idx]} available={actionTargets.includes(idx)} selectingAction={selectingAction}
              reducedMotion={reducedMotion} bulgeFilter={`url(#${bulgeId})`} trayRef={trayRef}
              rerollFeedback={rerollFeedback} onRollFinish={finishDieRoll} setHoveredId={setHoveredId} />;
          })}

          {comboSummary?.bonusDice?.map((bDie, bIdx) => {
            if (!visibleBonusIds.includes(bDie.id)) return null;
            const position = bonusPositions[bIdx];
            const source = bDie.source;
            const sourceLabel = source.kind === 'creature'
              ? dicePool.find((die) => die.id === source.diceId)!.name : bDie.sourceName;
            const isAttacking = attackingBonusIndex === bIdx;

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
