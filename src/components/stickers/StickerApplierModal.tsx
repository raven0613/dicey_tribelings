import React, { useEffect, useState } from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { StickerElementBadge } from './StickerElementBadge';

export const StickerApplierModal: React.FC = () => {
  const { stickerFlow, dicePool, applyCurrentPermanentSticker, discardCurrentSticker } = useGameStore();
  const [selectedDiceId, setSelectedDiceId] = useState(dicePool[0]?.id ?? '');
  const [hoveredFaceIndex, setHoveredFaceIndex] = useState<number | null>(null);
  const sticker = stickerFlow?.items[stickerFlow.index];

  useEffect(() => {
    if (!dicePool.some((die) => die.id === selectedDiceId)) {
      setSelectedDiceId(dicePool[0]?.id ?? '');
    }
  }, [dicePool, selectedDiceId]);

  if (!stickerFlow || !sticker || sticker.isDisposable) return null;
  const currentDie = dicePool.find((die) => die.id === selectedDiceId) ?? dicePool[0];

  return (
    <div className="modal-overlay">
      <div className="sticker-applier-card">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge"><Sparkles size={20} /></div>
            <div className="modal-title-box">
              <div className="modal-title">永久貼紙改造</div>
              <div className="modal-subtitle">
                第 {stickerFlow.index + 1}/{stickerFlow.items.length} 張，選擇骰面立即覆蓋，或放棄這張貼紙。
              </div>
            </div>
          </div>
          <button type="button" onClick={discardCurrentSticker} className="btn-skip-reward">
            放棄貼紙
          </button>
        </div>

        <div className="banner-overview">
          <div className="banner-left">
            <div className="val-tile">
              <span>{sticker.baseValue}</span>
              <StickerElementBadge element={sticker.element} />
            </div>
            <div className="banner-info">
              <div className="title-row">
                <span className="sticker-name">{sticker.name}</span>
                <span className="tag-pill perm">永久改造</span>
              </div>
              <p className="sticker-desc">{sticker.description}</p>
            </div>
          </div>
        </div>

        <div>
          <span className="step-label">1. 選擇骰子</span>
          <div className="dice-tabs-grid">
            {dicePool.map((die) => (
              <button
                type="button"
                key={die.id}
                onClick={() => setSelectedDiceId(die.id)}
                className={`dice-tab-btn ${selectedDiceId === die.id ? 'selected' : ''}`}
              >
                <span>{die.name}</span>
                {selectedDiceId === die.id && <CheckCircle size={14} color="#818cf8" />}
              </button>
            ))}
          </div>
        </div>

        {currentDie && (
          <div>
            <span className="step-label">2. 選擇要永久覆蓋的骰面</span>
            <div className="faces-apply-grid">
              {currentDie.faces.map((face, faceIndex) => {
                const isHovered = hoveredFaceIndex === faceIndex;
                return (
                  <button
                    type="button"
                    key={face.id}
                    onMouseEnter={() => setHoveredFaceIndex(faceIndex)}
                    onMouseLeave={() => setHoveredFaceIndex(null)}
                    onClick={() => applyCurrentPermanentSticker(currentDie.id, faceIndex)}
                    className={`face-apply-card ${isHovered ? 'hovered' : ''}`}
                  >
                    <div className="face-card-top"><span>第 {faceIndex + 1} 面</span></div>
                    <div className="face-val-row">
                      <div className="num">
                        {isHovered ? `${face.baseValue} → ${sticker.baseValue}` : face.baseValue}
                      </div>
                      <StickerElementBadge element={isHovered ? sticker.element : face.element} />
                    </div>
                    <div className="face-sub-info"><span>點擊永久替換</span><span>→</span></div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
