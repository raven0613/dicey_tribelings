import { Sword } from 'lucide-react';
import { CREATURE_CONFIG, CREATURE_TAG_NAMES } from '../../configs/creatures/creatureConfig';
import { DICE_FACE_PRESENTATION, DICE_IDENTITY_PRESENTATION } from '../../configs/dicePresentationConfig';
import type { CreatureId, CreatureTag } from '../../types/creatures';
import { SkillText } from '../common/SkillText';
import { DiceCharacter } from './DiceCharacter';

interface DiceIdentityHeaderProps {
  creature?: CreatureId;
  title: string;
  tags?: readonly CreatureTag[];
  attack: number | string;
}

export function DiceIdentityHeader({ creature, title, tags, attack }: DiceIdentityHeaderProps) {
  return <span className="dice-identity-header">
    {creature && <svg className="dice-identity-portrait" aria-hidden="true"
      width={DICE_IDENTITY_PRESENTATION.portraitSize} height={DICE_IDENTITY_PRESENTATION.portraitSize}
      viewBox={`0 0 ${DICE_FACE_PRESENTATION.viewBoxSize} ${DICE_FACE_PRESENTATION.viewBoxSize}`}>
      <DiceCharacter creature={creature} animate={false} />
    </svg>}
    <span className="dice-identity-details">
      <span className="dice-identity-title">
        <strong><SkillText text={creature ? CREATURE_CONFIG[creature].name : title} /></strong>
        {tags && <span className="dice-identity-tags">{tags.map((tag) => CREATURE_TAG_NAMES[tag]).join('・')}</span>}
      </span>
      <span className="dice-identity-attack" aria-label={`攻擊力 ${attack}`}>
        <Sword className="ui-icon" aria-hidden="true" /><strong>{attack}</strong>
      </span>
    </span>
  </span>;
}
