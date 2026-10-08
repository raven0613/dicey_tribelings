import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { Coins, Play } from 'lucide-react';
import { BATTLE_PREPARATION_PRESENTATION as config } from '../../../configs/battlePreparationConfig';
import { useGameStore } from '../../../store/gameStore';
import { validateTemporaryPlacements } from '../../../service/inventory/inventoryService';
import type { TemporaryStickerPlacement } from '../../../types/game';
import { EquipmentBar } from '../../equipment/EquipmentBar';
import { PlayerVitals } from '../PlayerVitals';
import { PreparationEnemySummary } from './PreparationEnemySummary';
import { StickerEditor } from '../../stickers/editor/StickerEditor';

export function BattlePreparationPanel() {
  const reducedMotion = useReducedMotion();
  const gold = useGameStore((state) => state.gold);
  const placements = useGameStore(state => state.temporaryPlacements);
  const [inventoryBusy, setInventoryBusy] = useState(false);
  const [stage, setStage] = useState<'entering' | 'ready' | 'leaving'>('entering');
  const [error, setError] = useState('');
  const pending = useRef<TemporaryStickerPlacement[] | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { panel.current?.focus(); }, []);

  const enterBattle = () => {
    if (stage !== 'ready' || pending.current || inventoryBusy) return;
    const { dicePool, consumableStickers } = useGameStore.getState();
    if (!validateTemporaryPlacements(dicePool, consumableStickers, placements)) {
      setError('配置已變更，請檢查貼紙位置與方向。'); return;
    }
    pending.current = placements;
    setStage('leaving');
  };
  return <div className="preparation-panel-viewport">
    <div ref={panel} className={`preparation-panel is-${stage}`} role="region"
      aria-labelledby="preparation-title" tabIndex={-1}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (stage === 'entering') setStage('ready');
        if (stage === 'leaving' && pending.current) {
          const placements = pending.current;
          pending.current = null;
          useGameStore.getState().confirmBattlePreparation(placements);
        }
      }}
      style={{
        '--preparation-slide-duration': `${reducedMotion ? 1 : config.slideMs}ms`,
        '--equipment-slot-size': `${config.equipmentSlotSize}px`,
        '--equipment-slot-gap': `${config.equipmentSlotGap}px`,
      } as CSSProperties}>
      <form className="preparation-panel-form" inert={stage !== 'ready'}
        onSubmit={(event) => { event.preventDefault(); enterBattle(); }}>
        <header className="preparation-panel-header">
          <div className="preparation-panel-title"><h1 id="preparation-title">{config.title}</h1>
            <span><Coins className="ui-icon" /> {gold}</span></div>
          <PreparationEnemySummary />
        </header>
        <div className="preparation-panel-body">
          <EquipmentBar idPrefix="preparation-equipment" />
          <StickerEditor onBusyChange={setInventoryBusy} />
        </div>
        <footer className="preparation-panel-footer">
          <PlayerVitals />
          <span role="status">{error || `已配置 ${placements.length} 張臨時貼紙・進入戰鬥後消耗並擲骰`}</span>
          <button type="submit" className="btn-resolve" disabled={stage !== 'ready' || inventoryBusy}>
            <Play className="ui-icon" />{config.enterLabel}
          </button>
        </footer>
      </form>
    </div>
  </div>;
}
