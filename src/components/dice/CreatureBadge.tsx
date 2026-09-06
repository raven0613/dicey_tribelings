import React from 'react';
import type { CreatureId } from '../../types/creatures';
import { CREATURE_CONFIG, CREATURE_TAG_NAMES } from '../../configs/creatures/creatureConfig';

export const CreatureBadge: React.FC<{ creature: CreatureId; size?: number; iconOnly?: boolean }> = ({
  creature, size = 14, iconOnly = false,
}) => {
  const meta = CREATURE_CONFIG[creature];
  const description = `${meta.name}｜${meta.ability}：${meta.description}（${meta.tags.map((tag) => CREATURE_TAG_NAMES[tag]).join('、')}）`;
  return <span className="creature-badge" style={{ color: meta.color }} title={description}>
    <span role="img" aria-label={meta.name} style={{ fontSize: size }}>{meta.emoji}</span>
    {!iconOnly && <span>{meta.name}</span>}
  </span>;
};
