import React from 'react';
import { PackageOpen } from 'lucide-react';
import { INVENTORY_CONFIG } from '../../configs/inventoryConfig';
import { useGameStore } from '../../store/gameStore';
import { CreatureBadge } from '../dice/CreatureBadge';

export const ConsumableBar: React.FC = () => {
  const consumables = useGameStore((state) => state.consumableStickers);

  return (
    <section className="consumable-bar">
      <div className="bar-header">
        <span className="bar-title"><PackageOpen size={14} />戰術貼紙 ({consumables.length}/{INVENTORY_CONFIG.consumableCapacity})</span>
        <span className="bar-tip">每場戰鬥開始前自由配置，貼上後維持整場戰鬥</span>
      </div>
      <div className="consumable-slots">
        {Array.from({ length: INVENTORY_CONFIG.consumableCapacity }, (_, index) => {
          const item = consumables[index];
          return item ? (
            <div className="consumable-slot occupied" key={item.instanceId}>
              <strong>{item.baseValue}</strong>
              <div><span>{item.name}</span><CreatureBadge creature={item.creature} size={11} /></div>
            </div>
          ) : (
            <div className="consumable-slot empty" key={index}>空欄位</div>
          );
        })}
      </div>
    </section>
  );
};
