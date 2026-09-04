import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Equipment } from '../../types/game';
import { Sparkles, Flame, Zap, RotateCcw, Layers, ShieldAlert, Wind } from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Flame,
  RotateCcw,
  Zap,
  Sparkles,
  FlameKindling: Flame,
  Wind,
  ShieldAlert,
  Layers,
};

interface FlyingRelicBadgeProps {
  equip: Equipment;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  onArrive: () => void;
}

export const FlyingRelicBadge: React.FC<FlyingRelicBadgeProps> = ({
  equip,
  startX,
  startY,
  targetX,
  targetY,
  onArrive,
}) => {
  const [pos, setPos] = useState({ x: startX, y: startY, scale: 1, opacity: 1, rotate: 0 });
  const [hasArrived, setHasArrived] = useState(false);

  useEffect(() => {
    // Trigger transition to target slot coordinates on next frame
    const frameId = requestAnimationFrame(() => {
      setPos({
        x: targetX,
        y: targetY,
        scale: 0.65,
        opacity: 1,
        rotate: 360,
      });
    });

    const timer = setTimeout(() => {
      setHasArrived(true);
      onArrive();
    }, 650);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, [startX, startY, targetX, targetY, onArrive]);

  const IconComponent = ICON_MAP[equip.iconName] || Sparkles;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`flying-relic-container ${hasArrived ? 'arrived' : ''}`}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: `translate(-50%, -50%) scale(${pos.scale}) rotate(${pos.rotate}deg)`,
        opacity: pos.opacity,
      }}
    >
      <div className={`flying-relic-badge ${equip.rarity}`}>
        <div className="badge-glow" />
        <IconComponent size={28} />
      </div>
      <div className="flying-relic-name">{equip.name}</div>
    </div>,
    document.body
  );
};
