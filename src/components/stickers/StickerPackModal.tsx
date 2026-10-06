import { useShallow } from 'zustand/react/shallow';
import { MaterialBadge, materialStyle } from '../dice/MaterialBadge';
import { SkillText } from '../common/SkillText';
import { RarityBadge } from '../dice/RarityBadge';
import React from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { StickerBadge } from './StickerBadge';

export const StickerPackModal: React.FC = () => {
  const { openedPackResult, beginOpenedPack } = useGameStore(useShallow((state) => ({
    openedPackResult: state.openedPackResult,
    beginOpenedPack: state.beginOpenedPack,
  })));
  if (!openedPackResult) return null;

  return (
    <div className="modal-overlay">
      <div className="pack-result-card">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge"><Gift className="ui-icon" /></div>
            <div className="modal-title-box">
              <div className="modal-title">{openedPackResult.packName}</div>
              <div className="modal-subtitle">已揭曉全部內容，接著逐張決定用途。</div>
            </div>
          </div>
        </div>
        <div className="pack-sticker-grid">
          {openedPackResult.stickers.map((sticker, index) => (
            <article className="pack-sticker-card" key={`${sticker.id}:${index}`} data-material={sticker.material}
              style={materialStyle(sticker.material)}>
              <div className="card-tag-row">
                <span className="type-badge permanent">
                  永久改造
                </span>
                <RarityBadge rarity={sticker.rarity} />
              </div>
              <strong className="pack-sticker-value">沿用骰面點數</strong>
              <StickerBadge creature={sticker.creature} />
              <MaterialBadge material={sticker.material} description />
              <h3>{sticker.name}</h3>
              <p><SkillText text={sticker.description} /></p>
            </article>
          ))}
        </div>
        <button type="button" className="btn-primary-modal" onClick={beginOpenedPack}>
          <Sparkles className="ui-icon" />逐張處理
        </button>
      </div>
    </div>
  );
};
