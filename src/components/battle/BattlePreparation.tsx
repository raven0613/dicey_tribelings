import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { TemporaryStickerPlacement } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { applyTemporaryPlacements } from '../../service/inventory/inventoryService';
import { DISPOSABLE_STICKERS } from '../../configs/creatures/creatureStickerConfig';
import { CreatureBadge } from '../dice/CreatureBadge';
import { DiceNet } from '../dice/DiceNet';
import { DiceTabs } from '../dice/DiceTabs';
import { ConsumableBar } from '../stickers/ConsumableBar';

export const BattlePreparation: React.FC = () => {
  const { dicePool, consumableStickers, confirmBattlePreparation, unlockedDiceNotification, stickerFlow } = useGameStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [diceId, setDiceId] = useState(dicePool[0].id);
  const [placements, setPlacements] = useState<TemporaryStickerPlacement[]>([]);
  const selected = consumableStickers.find((item) => item.instanceId === selectedId);
  const sticker = DISPOSABLE_STICKERS.find((item) => item.id === selected?.stickerId);
  const previewPool = applyTemporaryPlacements(dicePool, placements);
  const die = previewPool.find((item) => item.id === diceId) ?? previewPool[0];

  const assign = (faceIndex: number) => {
    if (!selected) return;
    setPlacements((current) => [...current.filter((item) => item.consumable.instanceId !== selected.instanceId
      && !(item.diceId === die.id && item.faceIndex === faceIndex)), { consumable: selected, diceId: die.id, faceIndex }]);
    setSelectedId(null);
  };
  return <form id="battle-preparation" className="battle-preparation" aria-label="本場組合配置"
    onSubmit={(event) => {
      event.preventDefault();
      if (!unlockedDiceNotification && !stickerFlow) confirmBattlePreparation(placements);
    }}>
    <ConsumableBar selectedId={selectedId} onSelect={(id) => setSelectedId(id === selectedId ? null : id)} />
    {placements.length > 0 && <div className="preparation-assignments" aria-live="polite">
      {placements.map((placement) => <button type="button" key={placement.consumable.instanceId}
        onClick={() => setPlacements((current) => current.filter((item) => item !== placement))}
        aria-label={`撤回${placement.consumable.name}`}>
        <CreatureBadge creature={placement.consumable.creature} />
        <span>{dicePool.find((item) => item.id === placement.diceId)!.name}・第 {placement.faceIndex + 1} 面</span>
        <X size={18} /><span>撤回</span>
      </button>)}
    </div>}
    <div className="preparation-editor">
      <div className="preparation-editor-header"><span>{selected ? `${selected.name}・沿用目標基礎攻擊力` : '骰池配置・選貼紙可暫時換面'}</span>
        {selected && <button type="button" onClick={() => setSelectedId(null)}>取消選取</button>}</div>
      <DiceTabs dicePool={previewPool} selectedDiceId={die.id} onSelect={setDiceId} />
      <DiceNet key={die.id} dice={die} sticker={sticker} onApplyFace={selected ? assign : undefined} />
    </div>
    <div className="preparation-summary">
      <span>{placements.length ? `已配置 ${placements.length} 張・擲骰後維持整場` : '準備好了就擲骰，開始戰鬥！'}</span>
    </div>
  </form>;
};
