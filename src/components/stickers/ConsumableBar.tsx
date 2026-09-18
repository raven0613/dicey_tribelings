import { SkillTooltip } from '../common/SkillTooltip';
import React from 'react';
import { PackageOpen } from 'lucide-react';
import { INVENTORY_CONFIG } from '../../configs/inventoryConfig';
import { useGameStore } from '../../store/gameStore';
import { CreatureBadge } from '../dice/CreatureBadge';

export const ConsumableBar: React.FC<{ selectedId: string | null; onSelect: (id: string) => void }> = ({ selectedId, onSelect }) => {
  const consumables = useGameStore((state) => state.consumableStickers);
  return <section className="consumable-bar">
    <div className="bar-header">
      <span className="bar-title"><PackageOpen size={18} />配置臨時貼紙 ({consumables.length}/{INVENTORY_CONFIG.consumableCapacity})</span>
      <span className="bar-tip">選貼紙，再點目標骰面；基礎攻擊力沿用原面</span>
    </div>
    <div className="consumable-slots">
      {Array.from({ length: INVENTORY_CONFIG.consumableCapacity }, (_, index) => {
        const item = consumables[index];
        if (!item) return <div className="consumable-slot empty" key={index}>空欄位</div>;
        const content = <><CreatureBadge creature={item.creature} size={18} showTooltip={false} /><span>{item.name}</span></>;
        return <button type="button" className="consumable-slot occupied" key={item.instanceId}
          aria-pressed={item.instanceId === selectedId} onClick={() => onSelect(item.instanceId)}><SkillTooltip text={item.description}>{content}</SkillTooltip></button>;
      })}
    </div>
  </section>;
};
