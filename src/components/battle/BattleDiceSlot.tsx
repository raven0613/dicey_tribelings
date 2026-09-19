import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Dice } from '../../types/game';
import type { CreatureId, CreatureTag } from '../../types/creatures';
import { useGameStore } from '../../store/gameStore';
import { ceilDamage } from '../../service/battle/damageValue';
import { getAttackPose } from '../../service/battle/attackPresentation';
import { BattleDie } from './BattleDie';
import { DiceAttackPortal } from './DiceAttackPortal';
import { DieStatusBadge, RationsAllocation } from './BattleStatusBadges';
import { SkillFeedback } from './SkillFeedback';
import { RerollPulse } from './useRerollFeedback';
import { DiceResultPanel } from './DiceResultPanel';
import { useDiceRoll } from './useDiceRoll';

interface BattleDiceSlotProps {
  die: Dice;
  idx: number;
  position: { x: number; y: number };
  size: number;
  spacing: number;
  attackTarget: { x: number; y: number };
  identity: { creature: CreatureId; tags: readonly CreatureTag[] };
  available: boolean;
  selectingAction: boolean;
  reducedMotion: boolean;
  bulgeFilter: string;
  trayRef: React.RefObject<HTMLDivElement | null>;
  rerollFeedback: { id: number; diceIds: string[] } | null;
  onRollFinish: (index: number, reroll: boolean) => void;
  setHoveredId: (id: string | null) => void;
}

export const BattleDiceSlot = React.memo(function BattleDiceSlot({ die, idx, position, size, spacing,
  attackTarget, identity, available, selectingAction, reducedMotion, bulgeFilter, trayRef,
  rerollFeedback, onRollFinish, setHoveredId }: BattleDiceSlotProps) {
  const { rolledIndices, combatPhase, comboSummary, creatureBattleState, currentEnemy,
    activeRerollingIndex, attackingDieIndex, attackingStage, attackEmphasis, skillFeedback,
    equipments, rerollAnimationId, useControlReroll, slotState, shield, food } = useGameStore(useShallow((state) => ({
    rolledIndices: state.rolledIndices, combatPhase: state.combatPhase, comboSummary: state.comboSummary,
    creatureBattleState: state.creatureBattleState, currentEnemy: state.currentEnemy,
    activeRerollingIndex: state.activeRerollingIndex, attackingDieIndex: state.attackingDieIndex,
    attackingStage: state.attackingStage, attackEmphasis: state.attackEmphasis, skillFeedback: state.skillFeedback,
    equipments: state.equipments, rerollAnimationId: state.rerollAnimationId, useControlReroll: state.useControlReroll,
    slotState: state.diceSlotStates[idx], shield: state.displayedShields[die.id], food: state.displayedFood[die.id],
  })));
  const unrolled = combatPhase === 'PREPARATION';
  const rationsEquipment = equipments.find((item) => item.ruleId === 'RATIONS');
  const reroll = activeRerollingIndex === idx;
  const rollKey = reroll ? `reroll:${rerollAnimationId}` : combatPhase === 'ROLLING' ? 'roll' : null;
  const roll = useDiceRoll(rollKey, rolledIndices[idx] ?? 0, die.faces.length, size, reroll,
    () => onRollFinish(idx, reroll));

  const calcItem = comboSummary?.items[idx];

  const storedFood = creatureBattleState.storedFood[die.id] ?? 0;
  const nextFood = calcItem ? comboSummary.nextStoredFood[die.id] ?? 0 : storedFood;
  const resolving = combatPhase === 'RESOLVING_CALCULATION' || combatPhase === 'RESOLVING_ATTACK';
  const resultLabels = calcItem && combatPhase === 'CONTROL_PHASE' ? [
    `攻擊 ${ceilDamage(calcItem.finalDamage)}`,
    calcItem.shieldGranted > 0 ? `護盾 ${calcItem.shieldGranted}` : '',
    storedFood > 0 || nextFood > 0 ? `儲糧 ${storedFood}→${nextFood}` : '',
  ].filter(Boolean) : resolving ? [
    (shield?.displayValue ?? 0) > 0 ? `護盾 ${shield.displayValue}` : '',
    (food?.displayValue ?? 0) > 0 ? `儲糧 ${food.displayValue}` : '',
  ].filter(Boolean) : [];
  const dieSize = size;
  const pumpVal = slotState?.displayValue;
  const creature = identity.creature;
  const rationsStored = comboSummary?.events.filter((event) => rationsEquipment && event.equipmentId === rationsEquipment.id)
    .flatMap((event) => event.changes).filter((change) => change.kind === 'food' && change.targetId === die.id)
    .reduce((sum, change) => sum + change.after - change.before, 0) ?? 0;

  const isRerolling = roll.rolling;
  const isAttacking = combatPhase === 'RESOLVING_ATTACK' && attackingDieIndex === idx;

  const offsetX = attackTarget.x - position.x;
  const offsetY = attackTarget.y - position.y;
  const pose = getAttackPose(isAttacking ? attackingStage : 'idle', attackEmphasis,
    { x: offsetX, y: offsetY }, reducedMotion);
  const rotation = pose.rotation;

  return (
    <DiceAttackPortal active={isAttacking} trayRef={trayRef}>
      <div
        data-attack-die={idx}
        className={`die-anchor ${resolving && pumpVal === 0 ? 'is-depleted' : ''} ${selectingAction ? available ? 'is-action-target' : 'is-not-action-target' : ''} ${isAttacking && attackEmphasis > 0 ? 'is-carry' : ''}`}
        style={{
          width: dieSize, height: dieSize,
          '--detail-width': `${spacing - 8}px`,
          '--attack-motion-duration': `${pose.duration}ms`,
          '--attack-motion-easing': pose.easing,
          left: position.x,
          top: position.y,
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

        <BattleDie dice={die} size={dieSize} rotation={rotation} motionRef={roll.ref}
          unrolled={unrolled} bulgeFilter={isAttacking && attackEmphasis > 0 && !reducedMotion ? bulgeFilter : undefined}
          faceIndex={roll.faceIndex} rolling={isRerolling}
          value={pumpVal} spinning={slotState?.isSpinning ?? false} locked={slotState?.isLocked ?? false} buffed={slotState?.isBuffed ?? false}
          numberScale={slotState?.scale ?? 1} effectiveCreature={isRerolling ? undefined : creature}
          effectiveTags={isRerolling ? undefined : identity.tags} reducedMotion={reducedMotion}
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
});
