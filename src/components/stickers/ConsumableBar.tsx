import { X } from 'lucide-react';
import { SkillTooltip } from '../common/SkillTooltip';
import { INVENTORY_CONFIG } from '../../configs/inventoryConfig';
import { ARROW_CONFIG } from '../../configs/directionalStickerConfig';
import { useGameStore } from '../../store/gameStore';
import { StickerBadge } from './StickerBadge';
import type { Dice, TemporaryStickerPlacement } from '../../types/game';

interface ConsumableBarProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  placements: TemporaryStickerPlacement[];
  dicePool: Dice[];
  onWithdraw: (id: string) => void;
}

export function ConsumableBar({ selectedId, onSelect, placements, dicePool, onWithdraw }: ConsumableBarProps) {
  const consumables = useGameStore((state) => state.consumableStickers);
  return <section className="consumable-bar" aria-label="臨時貼紙">
    <div className="consumable-slots">
      {Array.from({ length: INVENTORY_CONFIG.consumableCapacity }, (_, index) => {
        const item = consumables[index];
        if (!item) return <div className="consumable-slot empty" key={index}>空欄位</div>;
        const placed = placements.find((entry) => entry.consumable.instanceId === item.instanceId);
        const location = placed ? `${dicePool.find((die) => die.id === placed.diceId)!.name}・第 ${placed.faceIndex + 1} 面${placed.direction ? ` ${ARROW_CONFIG[placed.direction].glyph}` : ''}` : '尚未配置';
        return <div className="consumable-entry" key={item.instanceId}>
          <button type="button" className="consumable-slot occupied" aria-pressed={item.instanceId === selectedId}
            onClick={() => onSelect(item.instanceId)}>
            <SkillTooltip text={item.description}>
              <StickerBadge creature={item.creature} showTooltip={false} /><span className="consumable-location">{location}</span>
            </SkillTooltip>
          </button>
          {placed && <button type="button" className="consumable-withdraw" aria-label={`撤回${item.name}`}
            onClick={() => onWithdraw(item.instanceId)}><X className="ui-icon" /></button>}
        </div>;
      })}
    </div>
  </section>;
}
