import type { ComponentProps } from 'react';
import { Move } from 'lucide-react';
import { CreatureBadge } from '../dice/CreatureBadge';
import { SkillTooltip } from '../common/SkillTooltip';
import { DIRECTIONAL_STICKER } from '../../configs/directionalStickerConfig';
import type { StickerCreatureId } from '../../types/game';

type Props = Omit<ComponentProps<typeof CreatureBadge>, 'creature'> & { creature: StickerCreatureId };

export function StickerBadge({ creature, iconOnly, showTooltip = true, ...props }: Props) {
  if (creature !== 'directional') return <CreatureBadge creature={creature} iconOnly={iconOnly} showTooltip={showTooltip} {...props} />;
  const content = <span className="creature-badge"><Move className="ui-icon" aria-label={DIRECTIONAL_STICKER.name} />
    {!iconOnly && <span>{DIRECTIONAL_STICKER.name}</span>}</span>;
  return showTooltip ? <SkillTooltip text={DIRECTIONAL_STICKER.description}>{content}</SkillTooltip> : content;
}
