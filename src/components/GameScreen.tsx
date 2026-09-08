import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useStoryStore } from '../store/storyStore';
import { Footbar } from './common/Footbar';
import { PlayerVitals } from './battle/PlayerVitals';
import { MapProgress } from './map/MapProgress';
import { EnemyCard } from './battle/EnemyCard';
import { DiceBoard } from './battle/DiceBoard';
import { BattleControls } from './battle/BattleControls';
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
    screenShakeIntensity,
    currentNodeIndex,
    mapNodes,
    currentEnemy,
    combatPhase,
    activeRerollingIndex,
    executeBattleSettlement,
  } = useGameStore();

  const [isDiceBagOpen, setIsDiceBagOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const currentNode = mapNodes[currentNodeIndex];
  const isCombatNode =
    currentNode?.type === 'fight' || currentNode?.type === 'elite' || currentNode?.type === 'boss';
  const temporaryUnlocked = useStoryStore((state) => state.temporaryUnlocked);
  const isConfiguring = combatPhase === 'PREPARATION' && temporaryUnlocked;

  const handleResolveBattle = async () => {
    if (isResolving || combatPhase !== 'CONTROL_PHASE' || activeRerollingIndex !== null) return;
    setIsResolving(true);
    await executeBattleSettlement();
    setIsResolving(false);
  };

  return (
    <div
      className="app-wrapper"
      style={{
        transform:
          screenShakeIntensity > 0
            ? `translate(${(Math.random() - 0.5) * screenShakeIntensity}px, ${(Math.random() - 0.5) * screenShakeIntensity}px)`
            : 'none',
      }}
    >
      {/* Main Content Arena */}
      <main className="app-main">
        {/* Map Route Progress */}
        <MapProgress />

        {/* Combat Area */}
        {isCombatNode && (
          <div className={`combat-arena ${isConfiguring ? 'is-preparing' : ''}`}>
            {/* Enemy Display */}
            <EnemyCard
              enemy={currentEnemy}
            />

            {/* Dice Board Arena */}
            {!isConfiguring && <DiceBoard />}
            <PlayerVitals />

            {/* Tactical Control Bar & Resolve Action */}
            {isConfiguring
              ? <BattlePreparation key={currentNodeIndex} />
              : <BattleControls onResolve={handleResolveBattle} isResolving={isResolving} />}
          </div>
        )}

        {/* Chest Event Area */}
        {currentNode?.type === 'chest' && <ChestModal />}

        {/* Merchant Shop Area */}
        {currentNode?.type === 'shop' && <ShopModal />}
      </main>
      <Footbar onOpenDiceBag={() => setIsDiceBagOpen(true)} />

      {/* Modals & Overlays */}
      <StickerApplierModal />
      <StickerPackModal />
      <ConsumableReplacementModal />
      <EquipmentReplacementModal />
      <DiceUnlockModal />
      <RewardModal onOpenDiceBag={() => setIsDiceBagOpen(true)} inspectingDice={isDiceBagOpen} />
      <DiceInspectModal isOpen={isDiceBagOpen} onClose={() => setIsDiceBagOpen(false)} />
      <GameOverModal />
    </div>
  );
}
