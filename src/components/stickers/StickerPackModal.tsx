import { SkillText } from '../common/SkillText';
import { RarityBadge } from '../dice/RarityBadge';
import React from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { CreatureBadge } from '../dice/CreatureBadge';

export const StickerPackModal: React.FC = () => {
  const { openedPackResult, beginOpenedPack } = useGameStore();
  if (!openedPackResult) return null;

  return (
    <div className="modal-overlay">
      <div className="pack-result-card">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge"><Gift size={20} /></div>
            <div className="modal-title-box">
              <div className="modal-title">{openedPackResult.packName}</div>
              <div className="modal-subtitle">已揭曉全部內容，接著逐張決定用途。</div>
            </div>
          </div>
        </div>
        <div className="pack-sticker-grid">
          {openedPackResult.stickers.map((sticker) => (
            <article className="pack-sticker-card" key={sticker.id}>
              <div className="card-tag-row">
                <span className={`type-badge ${sticker.isDisposable ? 'disposable' : 'permanent'}`}>
                  {sticker.isDisposable ? '戰術消耗品' : '永久改造'}
                </span>
                <RarityBadge rarity={sticker.rarity} />
              </div>
              <strong className="pack-sticker-value">{'baseValue' in sticker ? sticker.baseValue : '沿用原值'}</strong>
              <CreatureBadge creature={sticker.creature} />
              <h3>{sticker.name}</h3>
              <p><SkillText text={sticker.description} /></p>
            </article>
          ))}
        </div>
        <button type="button" className="btn-primary-modal" onClick={beginOpenedPack}>
          <Sparkles size={16} />逐張處理
        </button>
      </div>
    </div>
  );
};
