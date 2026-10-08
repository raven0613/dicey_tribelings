import type { ButtonHTMLAttributes } from 'react';
import type { StickerItem } from '../../types/game';
import { BACKPACK_PRESENTATION } from '../../configs/inventoryConfig';
import { MaterialBadge, materialStyle } from '../dice/MaterialBadge';
import { RarityBadge } from '../dice/RarityBadge';
import { SkillText } from '../common/SkillText';
import { StickerBadge } from './StickerBadge';

export function StickerOverview({
  sticker,
  dragProps,
}: {
  sticker: StickerItem;
  dragProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const material = sticker.isDisposable === false ? sticker.material : undefined;
  const picture = (
    <StickerBadge
      creature={sticker.creature}
      iconOnly
      size={BACKPACK_PRESENTATION.transferSize}
      showTooltip={false}
    />
  );
  return (
    <div className="sticker-overview" data-material={material} style={materialStyle(material)}>
      <div className="sticker-overview-identity">
        {dragProps ? (
          <button
            type="button"
            className="sticker-overview-sticker"
            aria-label={`選取或拖曳${sticker.name}`}
            {...dragProps}
          >
            {picture}
          </button>
        ) : (
          <div className="sticker-overview-sticker">{picture}</div>
        )}
      </div>
      <div className="sticker-overview-info">
        <strong>{sticker.name}</strong>
        <RarityBadge rarity={sticker.rarity} />
        <MaterialBadge material={material} description />
        <p>
          <SkillText text={sticker.description} />
        </p>
        {dragProps && <small>拖曳到骰面或背包，也可選取後點骰面貼上。</small>}
      </div>
    </div>
  );
}
