import { SkillTooltip } from '../common/SkillTooltip';
import React from 'react';
import type { CreatureId } from '../../types/creatures';
import { CREATURE_CONFIG, CREATURE_TAG_NAMES } from '../../configs/creatures/creatureConfig';

export const CreatureBadge: React.FC<{ creature: CreatureId; size?: number; iconOnly?: boolean; showTooltip?: boolean }> = ({
  creature, size = 14, iconOnly = false, showTooltip = true,
}) => {
  const meta = CREATURE_CONFIG[creature];
  const description = `${meta.name}｜${meta.ability}：${meta.description}（${meta.tags.map((tag) => CREATURE_TAG_NAMES[tag]).join('、')}）`;
  const content = <span className="creature-badge" style={{ color: meta.color }}>
    <span role="img" aria-label={meta.name} style={{ fontSize: size }}>{meta.emoji}</span>
    {!iconOnly && <span>{meta.name}</span>}
  </span>;
  return showTooltip ? <SkillTooltip text={description}>{content}</SkillTooltip> : content;
};
