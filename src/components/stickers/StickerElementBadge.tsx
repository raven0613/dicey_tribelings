import React from 'react';
import { Circle, Flame, LucideIcon, Snowflake, Wind, Zap } from 'lucide-react';
import { ElementType } from '../../types/game';

const ELEMENT_META = {
  normal: { label: '普', color: '#cbd5e1', Icon: Circle },
  fire: { label: '火', color: '#fb7185', Icon: Flame },
  wind: { label: '風', color: '#34d399', Icon: Wind },
  thunder: { label: '雷', color: '#facc15', Icon: Zap },
  ice: { label: '冰', color: '#22d3ee', Icon: Snowflake },
} satisfies Record<ElementType, { label: string; color: string; Icon: LucideIcon }>;

export const StickerElementBadge: React.FC<{ element: ElementType; size?: number }> = ({
  element,
  size = 12,
}) => {
  const { label, color, Icon } = ELEMENT_META[element];
  return (
    <span className="sticker-element-badge" style={{ color }}>
      <Icon size={size} />
      {label}
    </span>
  );
};
