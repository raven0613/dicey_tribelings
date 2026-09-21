import { useShallow } from 'zustand/react/shallow';
import { SkillText } from '../common/SkillText';
import React, { useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { EquipmentTransferAnimation, getElementCenter, getEquipmentSlotCenter } from './EquipmentTransferAnimation';
import type { TransferPoint } from './EquipmentTransferAnimation';

interface ReplacementTransferState {
  replacedEquipmentId: string;
  start: TransferPoint;
  target: TransferPoint;
}

export const EquipmentReplacementModal: React.FC = () => {
  const {
    pendingEquipment,
    equipments,
    replacePendingEquipment,
    cancelPendingEquipment,
    skipChestReward,
  } = useGameStore(useShallow((state) => ({
    pendingEquipment: state.pendingEquipment,
    equipments: state.equipments,
    replacePendingEquipment: state.replacePendingEquipment,
    cancelPendingEquipment: state.cancelPendingEquipment,
    skipChestReward: state.skipChestReward,
  })));
  const incomingEquipmentRef = useRef<HTMLDivElement>(null);
  const [transfer, setTransfer] = useState<ReplacementTransferState | null>(null);
  if (!pendingEquipment) return null;

  const handleReplace = (equipmentId: string) => {
    if (pendingEquipment.source === 'shop') {
      replacePendingEquipment(equipmentId);
      return;
    }
    if (transfer || !incomingEquipmentRef.current) return;
    const slotIndex = equipments.findIndex((equipment) => equipment.id === equipmentId);
    setTransfer({
      replacedEquipmentId: equipmentId,
      start: getElementCenter(incomingEquipmentRef.current),
      target: getEquipmentSlotCenter(slotIndex),
    });
  };

  const handleArrival = () => {
    if (!transfer) return;
    const { replacedEquipmentId } = transfer;
    setTransfer(null);
    replacePendingEquipment(replacedEquipmentId);
  };

  return (
    <div className="modal-overlay">
      <div className="replacement-card">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge"><RefreshCcw className="ui-icon" /></div>
            <div className="modal-title-box">
              <div className="modal-title">裝備槽已滿</div>
              <div className="modal-subtitle">
                {pendingEquipment.source === 'chest'
                  ? '選擇一件現有裝備替換、返回寶箱選擇，或跳過獎勵。'
                  : '選擇一件現有裝備替換，或取消購買。'}
              </div>
            </div>
          </div>
        </div>
        <div ref={incomingEquipmentRef} className="incoming-item-card">
          <div><h3>{pendingEquipment.equipment.name}</h3><span>{pendingEquipment.equipment.rarity}</span></div>
          <p><SkillText text={pendingEquipment.equipment.description} /></p>
          {pendingEquipment.source === 'shop' && <span className="price-note">確認後支付 {pendingEquipment.cost} 金幣</span>}
        </div>
        <div className="equipment-replacement-list">
          {equipments.map((equipment) => (
            <button
              type="button"
              key={equipment.id}
              disabled={transfer !== null}
              className={transfer?.replacedEquipmentId === equipment.id ? 'replacement-target' : ''}
              onClick={() => handleReplace(equipment.id)}
            >
              <span>{transfer?.replacedEquipmentId === equipment.id ? '替換中' : '取代'}</span>
              <strong>{equipment.name}</strong>
              <small><SkillText text={equipment.description} /></small>
            </button>
          ))}
        </div>
        <button type="button" disabled={transfer !== null} className="btn-secondary-modal" onClick={cancelPendingEquipment}>
          {pendingEquipment.source === 'chest' ? '返回寶箱選擇' : '取消購買'}
        </button>
        {pendingEquipment.source === 'chest' && (
          <button type="button" disabled={transfer !== null} className="btn-secondary-modal" onClick={skipChestReward}>
            跳過獎勵，繼續前進
          </button>
        )}
      </div>
      {transfer && (
        <EquipmentTransferAnimation
          equipment={pendingEquipment.equipment}
          start={transfer.start}
          target={transfer.target}
          onArrive={handleArrival}
        />
      )}
    </div>
  );
};
