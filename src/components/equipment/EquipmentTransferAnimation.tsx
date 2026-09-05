import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Equipment } from '../../types/game';
import { getEquipmentIcon } from './equipmentIcons';

export interface TransferPoint {
  x: number;
  y: number;
}

export function getElementCenter(element: Element): TransferPoint {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

interface EquipmentTransferAnimationProps {
  equipment: Equipment;
  start: TransferPoint;
  target: TransferPoint;
  onArrive: () => void;
}

export const EquipmentTransferAnimation: React.FC<EquipmentTransferAnimationProps> = ({
  equipment,
  start,
  target,
  onArrive,
}) => {
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setIsMoving(true));
    return () => cancelAnimationFrame(frameId);
  }, [start.x, start.y, target.x, target.y]);

  if (typeof document === 'undefined') return null;

  const Icon = getEquipmentIcon(equipment.iconName);
  const position = isMoving ? target : start;

  return createPortal(
    <div
      aria-hidden="true"
      className="equipment-transfer"
      onTransitionEnd={(event) => {
        if (isMoving && event.propertyName === 'transform') onArrive();
      }}
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) scale(${isMoving ? 0.65 : 1}) rotate(${isMoving ? 360 : 0}deg)`,
      }}
    >
      <div className={`equipment-transfer-icon ${equipment.rarity}`}>
        <span className="equipment-transfer-ring" />
        <Icon size={28} />
      </div>
      <span className="equipment-transfer-name">{equipment.name}</span>
    </div>,
    document.body
  );
};
