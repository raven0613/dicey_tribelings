import type { StickerBundleReward } from '../../types/game';
import type { CSSProperties } from 'react';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { CreatureBadge } from '../dice/CreatureBadge';
import { MaterialBadge, materialStyle } from '../dice/MaterialBadge';
import { RarityBadge } from '../dice/RarityBadge';
import { SkillText } from '../common/SkillText';

interface RewardBundleCardProps {
  option: StickerBundleReward;
  onPreview: () => void;
  onClaim: () => void;
}

export function RewardBundleCard({ option, onPreview, onClaim }: RewardBundleCardProps) {
  return <article className="reward-bundle" data-material={option.sticker.material}
    style={materialStyle(option.sticker.material)}>
    <button type="button" className="reward-bundle-preview" onClick={onPreview}
      aria-label={`預覽${option.sticker.name}的骰面配置`}>
      <div className="reward-fan">
        {option.hidden.map((_, index) => <span key={index} className="reward-fan-back"
          style={{ '--back-order': index + 1 } as CSSProperties}>?</span>)}
        <div className="reward-fan-front">
          <RarityBadge rarity={option.sticker.rarity} />
          <CreatureBadge creature={option.sticker.creature} size={48} iconOnly showTooltip={false} />
          <strong>{CREATURE_CONFIG[option.sticker.creature].name}</strong>
          <MaterialBadge material={option.sticker.material} />
        </div>
      </div>
      <p className="reward-skill-text">
        <strong><SkillText text={CREATURE_CONFIG[option.sticker.creature].ability} /></strong>
        <br /><SkillText text={option.sticker.description} />
      </p>
      <span className="reward-preview-label">預覽配置</span>
    </button>
    <strong>{option.hidden.length + 1} 張</strong>
    <p>較容易出現相關土人貼紙</p>
    <button type="button" className="btn-primary-modal" onClick={onClaim}>選擇</button>
  </article>;
}
