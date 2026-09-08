import { Coins, Dices, Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { EquipmentBar } from '../equipment/EquipmentBar';

export function Footbar({ onOpenDiceBag }: { onOpenDiceBag: () => void }) {
  const { gold, dicePool, soundMuted, toggleSound } = useGameStore();
  return <footer className="footbar">
    <div className="footbar-content">
      <EquipmentBar />
      <div className="footbar-tools">
        <span className="footbar-gold"><Coins size={18} />{gold} 金幣</span>
        <button type="button" id="btn-dice-bag" onClick={onOpenDiceBag}>
          <Dices size={20} /><span>骰池（{dicePool.length}）</span>
        </button>
        <button type="button" id="btn-toggle-sound" onClick={toggleSound}
          aria-label={soundMuted ? '開啟音效' : '靜音'} aria-pressed={soundMuted}>
          {soundMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
    </div>
  </footer>;
}
