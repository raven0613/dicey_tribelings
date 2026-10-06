import { SkillTooltip } from '../common/SkillTooltip';
import React from 'react';
import type { CreatureId } from '../../types/creatures';
import { CREATURE_CONFIG, CREATURE_TAG_NAMES } from '../../configs/creatures/creatureConfig';
import { DICE_FACE_PRESENTATION } from '../../configs/dicePresentationConfig';
import { DiceCharacter } from './DiceCharacter';

export const CreatureBadge: React.FC<{ creature: CreatureId; size?: number; iconOnly?: boolean; showTooltip?: boolean }> = ({
  creature, size = 14, iconOnly = false, showTooltip = true,
}) => {
  const meta = CREATURE_CONFIG[creature];
  const imageSize = `max(${size}px, var(--ui-icon-size))`;
  const description = `${meta.name}｜${meta.ability ? `${meta.ability}：` : ''}${meta.description}${meta.tags.length ? `（${meta.tags.map((tag) => CREATURE_TAG_NAMES[tag]).join('、')}）` : ''}`;
  const content = <span className="creature-badge" style={{ color: meta.color }}>
    <svg className="creature-badge-image" role="img" aria-label={meta.name}
      viewBox={`0 0 ${DICE_FACE_PRESENTATION.viewBoxSize} ${DICE_FACE_PRESENTATION.viewBoxSize}`}
      style={{ width: imageSize, height: imageSize }}>
      <DiceCharacter creature={creature} animate={false} />
    </svg>
    {!iconOnly && <span>{meta.name}</span>}
  </span>;
  return showTooltip ? <SkillTooltip text={description}>{content}</SkillTooltip> : content;
};
