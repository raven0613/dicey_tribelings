import React, { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { Footbar } from './components/common/Footbar';
import { PlayerVitals } from './components/battle/PlayerVitals';
import { MapProgress } from './components/map/MapProgress';
import { EnemyCard } from './components/battle/EnemyCard';
import { DiceBoard } from './components/battle/DiceBoard';
import { BattleControls } from './components/battle/BattleControls';
import { StickerApplierModal } from './components/stickers/StickerApplierModal';
import { DiceInspectModal } from './components/dice/DiceInspectModal';
import { RewardModal } from './components/rewards/RewardModal';
import { ChestModal } from './components/chest/ChestModal';
import { ShopModal } from './components/shop/ShopModal';
import { GameOverModal } from './components/common/GameOverModal';
import { BattlePreparation } from './components/battle/BattlePreparation';
import { StickerPackModal } from './components/stickers/StickerPackModal';
import { ConsumableReplacementModal } from './components/stickers/ConsumableReplacementModal';
import { EquipmentReplacementModal } from './components/equipment/EquipmentReplacementModal';
import { DiceUnlockModal } from './components/dice/DiceUnlockModal';

export default function App() {
  const {
    screenShakeIntensity,
    currentNodeIndex,
    mapNodes,
    currentEnemy,
    combatPhase,
    activeRerollingIndex,
    executeBattleSettlement,
    startNode,
  } = useGameStore();

  const [isDiceBagOpen, setIsDiceBagOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const initializedRef = React.useRef(false);

  // Initialize start node strictly once on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      startNode(0);
    }
  }, [startNode]);

  const currentNode = mapNodes[currentNodeIndex];
  const isCombatNode =
    currentNode?.type === 'fight' || currentNode?.type === 'elite' || currentNode?.type === 'boss';
  const isConfiguring = combatPhase === 'PREPARATION' && currentNodeIndex > 0;

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
