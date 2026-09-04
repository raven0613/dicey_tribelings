import React, { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { HeaderBar } from './components/common/HeaderBar';
import { MapProgress } from './components/map/MapProgress';
import { EnemyCard } from './components/battle/EnemyCard';
import { DiceBoard } from './components/battle/DiceBoard';
import { ComboBanner } from './components/battle/ComboBanner';
import { BattleControls } from './components/battle/BattleControls';
import { EquipmentBar } from './components/equipment/EquipmentBar';
import { StickerApplierModal } from './components/stickers/StickerApplierModal';
import { DiceInspectModal } from './components/dice/DiceInspectModal';
import { RewardModal } from './components/rewards/RewardModal';
import { ChestModal } from './components/chest/ChestModal';
import { ShopModal } from './components/shop/ShopModal';
import { GameOverModal } from './components/common/GameOverModal';

export default function App() {
  const {
    screenShakeIntensity,
    currentNodeIndex,
    mapNodes,
    currentEnemy,
    combatPhase,
    comboSummary,
    executeBattleSettlement,
    startNode,
  } = useGameStore();

  const [isDiceBagOpen, setIsDiceBagOpen] = useState(false);
  const [calculationStep, setCalculationStep] = useState(0);
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

  const handleResolveBattle = async () => {
    if (isResolving || combatPhase !== 'CONTROL_PHASE') return;
    setIsResolving(true);
    await executeBattleSettlement((step) => {
      setCalculationStep(step);
    });
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
      {/* Top Header */}
      <HeaderBar onOpenDiceBag={() => setIsDiceBagOpen(true)} />

      {/* Main Content Arena */}
      <main className="app-main">
        {/* Map Route Progress */}
        <MapProgress />

        {/* Combat Area */}
        {isCombatNode && (
          <div className="combat-arena">
            {/* Enemy Display */}
            <EnemyCard
              enemy={currentEnemy}
            />

            {/* Active Combo Synergies Banner */}
            <ComboBanner summary={comboSummary} />

            {/* 3D Fake Physics Dice Board Arena */}
            <DiceBoard currentStepIndex={calculationStep} />

            {/* Tactical Control Bar & Resolve Action */}
            <BattleControls onResolve={handleResolveBattle} isResolving={isResolving} />
          </div>
        )}

        {/* Chest Event Area */}
        {currentNode?.type === 'chest' && <ChestModal />}

        {/* Merchant Shop Area */}
        {currentNode?.type === 'shop' && <ShopModal />}

        {/* Equipment Relics Bar */}
        <EquipmentBar />
      </main>

      {/* Modals & Overlays */}
      <StickerApplierModal />
      <DiceInspectModal isOpen={isDiceBagOpen} onClose={() => setIsDiceBagOpen(false)} />
      <RewardModal />
      <GameOverModal />
    </div>
  );
}
