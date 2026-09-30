import { CampPanel } from './camp/CampPanel';
import { GameScene } from './background/GameScene';
import { useShallow } from 'zustand/react/shallow';
import { PaidRerollDialog } from './battle/PaidRerollDialog';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useStoryStore } from '../store/storyStore';
import { Footbar } from './common/Footbar';
import { MapProgress } from './map/MapProgress';
import { EnemyFormation } from './battle/EnemyFormation';
import { DiceBoard } from './battle/DiceBoard';
import { waitForEnemyAttackMotion } from './battle/waitForEnemyAttackMotion';
import { waitForDiceAttackMotion } from './battle/waitForDiceAttackMotion';
import { PlayerBoard } from './battle/PlayerBoard';
import { GameImpactFrame } from './battle/GameImpactFrame';
import { StickerApplierModal } from './stickers/StickerApplierModal';
import { DiceInspectModal } from './dice/DiceInspectModal';
import { RewardModal } from './rewards/RewardModal';
import { ChestModal } from './chest/ChestModal';
import { ShopModal } from './shop/ShopModal';
import { GameOverModal } from './common/GameOverModal';
import { BattlePreparationPanel } from './battle/preparation/BattlePreparationPanel';
import { StickerPackModal } from './stickers/StickerPackModal';
import { ConsumableReplacementModal } from './stickers/ConsumableReplacementModal';
import { EquipmentReplacementModal } from './equipment/EquipmentReplacementModal';
import { DiceDraftModal } from './rewards/DiceDraftModal';

export function GameScreen() {
  const {
    currentNodeIndex, routeChoices,
    mapNodes,
    combatPhase,
    activeRerollingIndex, pendingPaidRerollDiceId,
    executeBattleSettlement,
    stickerFlow, openedPackResult,
  } = useGameStore(useShallow((state) => ({
    currentNodeIndex: state.currentNodeIndex,
    routeChoices: state.routeChoices,
    mapNodes: state.mapNodes,
    combatPhase: state.combatPhase,
    activeRerollingIndex: state.activeRerollingIndex,
    pendingPaidRerollDiceId: state.pendingPaidRerollDiceId,
    executeBattleSettlement: state.executeBattleSettlement,
    stickerFlow: state.stickerFlow,
    openedPackResult: state.openedPackResult,
  })));

  const [isDiceBagOpen, setIsDiceBagOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const currentNode = mapNodes[currentNodeIndex];
  const isCombatNode =
    currentNode?.type === 'fight' || currentNode?.type === 'elite' || currentNode?.type === 'boss';
  const temporaryUnlocked = useStoryStore((state) => state.temporaryUnlocked);
  const storyPending = useStoryStore((state) => state.queue.length > 0);
  const isCombat = routeChoices.length === 0 && isCombatNode;
  const isConfiguring = isCombat && combatPhase === 'PREPARATION' && temporaryUnlocked;
  const showPreparation = isConfiguring && !stickerFlow && !openedPackResult && !storyPending;

  const handleResolveBattle = async () => {
    if (isResolving || combatPhase !== 'CONTROL_PHASE' || activeRerollingIndex !== null) return;
    setIsResolving(true);
    await executeBattleSettlement(waitForDiceAttackMotion, waitForEnemyAttackMotion);
    setIsResolving(false);
  };

  return (
    <GameScene>
      {isCombat && <GameImpactFrame />}
      <MapProgress />
      <div className="game-screen-content">
        <div className="game-screen-background" inert={isConfiguring}>
          <main className="app-main">
            <div className="combat-arena">
              {isCombat && <EnemyFormation />}
              <PlayerBoard isCombat={isCombat}>
                {isCombat && <DiceBoard />}
                {routeChoices.length === 0 && currentNode?.type === 'chest' && <ChestModal />}
                {routeChoices.length === 0 && currentNode?.type === 'shop' && <ShopModal />}
                {routeChoices.length === 0 && currentNode?.type === 'camp' && <CampPanel />}
              </PlayerBoard>
            </div>
          </main>
          <Footbar isCombat={isCombat} onResolve={handleResolveBattle} isResolving={isResolving} onOpenDiceBag={() => setIsDiceBagOpen(true)} />
        </div>
        {showPreparation && <BattlePreparationPanel key={currentNodeIndex} />}
      </div>

      {/* Modals & Overlays */}
      <StickerApplierModal />
      <StickerPackModal />
      <ConsumableReplacementModal />
      <EquipmentReplacementModal />
      <DiceDraftModal onOpenDiceBag={() => setIsDiceBagOpen(true)} inspectingDice={isDiceBagOpen} />
      <RewardModal onOpenDiceBag={() => setIsDiceBagOpen(true)} inspectingDice={isDiceBagOpen} />
      <DiceInspectModal isOpen={isDiceBagOpen} onClose={() => setIsDiceBagOpen(false)} />
      <GameOverModal />
      {pendingPaidRerollDiceId && <PaidRerollDialog />}
    </GameScene>
  );
}
