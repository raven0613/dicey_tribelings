import { BattleScreenShake } from './battle/BattleScreenShake';
import { useShallow } from 'zustand/react/shallow';
import { PaidRerollDialog } from './battle/PaidRerollDialog';
import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useStoryStore } from '../store/storyStore';
import { Footbar } from './common/Footbar';
import { MapProgress } from './map/MapProgress';
import { EnemyCard } from './battle/EnemyCard';
import { DiceBoard } from './battle/DiceBoard';
import { waitForDiceAttackMotion } from './battle/waitForDiceAttackMotion';
import { PlayerBoard } from './battle/PlayerBoard';
import { StickerApplierModal } from './stickers/StickerApplierModal';
import { DiceInspectModal } from './dice/DiceInspectModal';
import { RewardModal } from './rewards/RewardModal';
import { ChestModal } from './chest/ChestModal';
import { ShopModal } from './shop/ShopModal';
import { GameOverModal } from './common/GameOverModal';
import { BattlePreparation } from './battle/BattlePreparation';
import { StickerPackModal } from './stickers/StickerPackModal';
import { ConsumableReplacementModal } from './stickers/ConsumableReplacementModal';
import { EquipmentReplacementModal } from './equipment/EquipmentReplacementModal';
import { DiceUnlockModal } from './dice/DiceUnlockModal';

export function GameScreen() {
  const {
    currentNodeIndex, routeChoices,
    mapNodes,
    combatPhase,
    activeRerollingIndex, pendingPaidRerollDiceId,
    executeBattleSettlement,
  } = useGameStore(useShallow((state) => ({
    currentNodeIndex: state.currentNodeIndex,
    routeChoices: state.routeChoices,
    mapNodes: state.mapNodes,
    combatPhase: state.combatPhase,
    activeRerollingIndex: state.activeRerollingIndex,
    pendingPaidRerollDiceId: state.pendingPaidRerollDiceId,
    executeBattleSettlement: state.executeBattleSettlement,
  })));

  const [isDiceBagOpen, setIsDiceBagOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const currentNode = mapNodes[currentNodeIndex];
  const isCombatNode =
    currentNode?.type === 'fight' || currentNode?.type === 'elite' || currentNode?.type === 'boss';
  const temporaryUnlocked = useStoryStore((state) => state.temporaryUnlocked);
  const isCombat = routeChoices.length === 0 && isCombatNode;
  const isConfiguring = isCombat && combatPhase === 'PREPARATION' && temporaryUnlocked;

  const handleResolveBattle = async () => {
    if (isResolving || combatPhase !== 'CONTROL_PHASE' || activeRerollingIndex !== null) return;
    setIsResolving(true);
    await executeBattleSettlement(waitForDiceAttackMotion);
    setIsResolving(false);
  };

  return (
    <BattleScreenShake>
      <MapProgress />
      <main className="app-main">
        <div className="combat-arena">
          {isCombat && <EnemyCard />}
          <PlayerBoard isCombat={isCombat}>
            {isCombat && (isConfiguring
              ? <BattlePreparation key={currentNodeIndex} />
              : <DiceBoard />)}
            {routeChoices.length === 0 && currentNode?.type === 'chest' && <ChestModal />}
            {routeChoices.length === 0 && currentNode?.type === 'shop' && <ShopModal />}
          </PlayerBoard>
        </div>
      </main>
      <Footbar isCombat={isCombat} isConfiguring={isConfiguring} onResolve={handleResolveBattle} isResolving={isResolving} onOpenDiceBag={() => setIsDiceBagOpen(true)} />

      {/* Modals & Overlays */}
      <StickerApplierModal />
      <StickerPackModal />
      <ConsumableReplacementModal />
      <EquipmentReplacementModal />
      <DiceUnlockModal />
      <RewardModal onOpenDiceBag={() => setIsDiceBagOpen(true)} inspectingDice={isDiceBagOpen} />
      <DiceInspectModal isOpen={isDiceBagOpen} onClose={() => setIsDiceBagOpen(false)} />
      <GameOverModal />
      {pendingPaidRerollDiceId && <PaidRerollDialog />}
    </BattleScreenShake>
  );
}
