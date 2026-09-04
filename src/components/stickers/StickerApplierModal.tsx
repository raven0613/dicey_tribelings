import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ElementType } from '../../types/game';
import { Sparkles, Flame, Wind, Zap, Snowflake, Circle, CheckCircle, X } from 'lucide-react';

export const StickerApplierModal: React.FC = () => {
  const { stickerToApply, dicePool, applyStickerToFace, setStickerToApply, advanceToNextNode, combatPhase } =
    useGameStore();

  const [selectedDiceId, setSelectedDiceId] = useState<string>(dicePool[0]?.id || '');
  const [hoveredFaceIndex, setHoveredFaceIndex] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  React.useEffect(() => {
    setIsApplying(false);
  }, [stickerToApply]);

  if (!stickerToApply) return null;

  const currentDie = dicePool.find((d) => d.id === selectedDiceId) || dicePool[0];

  const handleApply = (faceIndex: number) => {
    if (!currentDie || isApplying) return;
    setIsApplying(true);
    applyStickerToFace(currentDie.id, faceIndex, stickerToApply);

    // If we're in victory reward phase, automatically advance to next map node
    if (combatPhase === 'VICTORY') {
      advanceToNextNode();
    }
  };

  const getElementBadge = (elem: ElementType) => {
    switch (elem) {
      case 'fire':
        return <span style={{ color: '#fb7185', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Flame size={12} /> 火</span>;
      case 'wind':
        return <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Wind size={12} /> 風</span>;
      case 'thunder':
        return <span style={{ color: '#facc15', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Zap size={12} /> 雷</span>;
      case 'ice':
        return <span style={{ color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Snowflake size={12} /> 冰</span>;
      default:
        return <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Circle size={12} /> 普</span>;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="sticker-applier-card">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge">
              <Sparkles size={20} />
            </div>
            <div className="modal-title-box">
              <div className="modal-title">改造工坊 • 黏貼骰面貼紙</div>
              <div className="modal-subtitle">選擇目標骰子與骰面，直接覆蓋替換以強化您的骰池！</div>
            </div>
          </div>
          {combatPhase !== 'VICTORY' && (
            <button
              onClick={() => setStickerToApply(null)}
              className="modal-close-btn"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Sticker Overview Card */}
        <div className="banner-overview">
          <div className="banner-left">
            <div className="val-tile">
              <span>{stickerToApply.baseValue}</span>
              <span style={{ fontSize: '10px' }}>{getElementBadge(stickerToApply.element)}</span>
            </div>
            <div className="banner-info">
              <div className="title-row">
                <span className="sticker-name">{stickerToApply.name}</span>
                <span className={`tag-pill ${stickerToApply.isDisposable ? 'disposable' : 'perm'}`}>
                  {stickerToApply.isDisposable ? '【一次性爆發貼紙】' : '【永久改造貼紙】'}
                </span>
              </div>
              <p className="sticker-desc">{stickerToApply.description}</p>
            </div>
          </div>
        </div>

        {/* Step 1: Select Target Die */}
        <div>
          <span className="step-label">1. 選擇要改造的骰子：</span>
          <div className="dice-tabs-grid">
            {dicePool.map((die) => (
              <button
                key={die.id}
                onClick={() => setSelectedDiceId(die.id)}
                className={`dice-tab-btn ${selectedDiceId === die.id ? 'selected' : ''}`}
              >
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900 }}>{die.name}</span>
                  {selectedDiceId === die.id && <CheckCircle size={14} color="#818cf8" />}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{die.faces.length} 面骰</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Face to Cover */}
        {currentDie && (
          <div>
            <span className="step-label">
              2. 選擇要覆蓋的骰面（點擊立即黏貼）：
            </span>
            <div className="faces-apply-grid">
              {currentDie.faces.map((face, fIdx) => {
                const isHovered = hoveredFaceIndex === fIdx;
                const isTemp = !!face.temporarySticker;
                const effectiveVal = isTemp ? face.temporarySticker!.baseValue : face.baseValue;
                const effectiveElem = isTemp ? face.temporarySticker!.element : face.element;

                return (
                  <div
                    key={face.id || fIdx}
                    onMouseEnter={() => setHoveredFaceIndex(fIdx)}
                    onMouseLeave={() => setHoveredFaceIndex(null)}
                    onClick={() => handleApply(fIdx)}
                    className={`face-apply-card ${isHovered ? 'hovered' : ''}`}
                  >
                    <div className="face-card-top">
                      <span>第 {fIdx + 1} 面</span>
                      {isTemp && (
                        <span style={{ fontSize: '9px', backgroundColor: 'rgba(159, 18, 57, 0.8)', color: '#fda4af', padding: '0 4px', borderRadius: '4px' }}>
                          一次性中
                        </span>
                      )}
                    </div>

                    {/* Face Value and Element */}
                    <div className="face-val-row">
                      <div className="num">
                        {isHovered ? (
                          <span className="replacement-preview">
                            {effectiveVal} → {stickerToApply.baseValue}
                          </span>
                        ) : (
                          effectiveVal
                        )}
                      </div>
                      <div>
                        {isHovered ? getElementBadge(stickerToApply.element) : getElementBadge(effectiveElem)}
                      </div>
                    </div>

                    <div className="face-sub-info">
                      <span>點擊替換</span>
                      <span style={{ color: '#fbbf24', fontWeight: 700 }}>→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
