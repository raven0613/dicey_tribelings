import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ElementType } from '../../types/game';
import { Dices, X, Flame, Wind, Zap, Snowflake, Circle } from 'lucide-react';

interface DiceInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiceInspectModal: React.FC<DiceInspectModalProps> = ({ isOpen, onClose }) => {
  const { dicePool } = useGameStore();
  const [selectedDiceId, setSelectedDiceId] = useState<string>(dicePool[0]?.id || '');

  if (!isOpen) return null;

  const currentDie = dicePool.find((d) => d.id === selectedDiceId) || dicePool[0];

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
      <div className="dice-inspect-card">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge">
              <Dices size={20} />
            </div>
            <div className="modal-title-box">
              <div className="modal-title">骰池庫藏 • 骰面檢視</div>
              <div className="modal-subtitle">目前持有 {dicePool.length} 顆骰子，點擊檢視各面屬性與貼紙</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dice Selector Tabs */}
        <div className="dice-tabs-nav">
          {dicePool.map((die) => (
            <button
              key={die.id}
              onClick={() => setSelectedDiceId(die.id)}
              className={`inspect-tab-btn ${selectedDiceId === die.id ? 'selected' : 'unselected'}`}
            >
              <Dices size={16} />
              <span>{die.name}</span>
            </button>
          ))}
        </div>

        {/* Selected Die Faces Grid */}
        {currentDie && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="dice-meta-row">
              <span>骰子類型：<strong className="strong-val">{currentDie.dieType} ({currentDie.faces.length} 面)</strong></span>
              <span>主配色：<strong className="theme-val">{currentDie.colorTheme}</strong></span>
            </div>

            <div className="inspect-faces-grid">
              {currentDie.faces.map((face, idx) => {
                const isTemp = !!face.temporarySticker;
                const effectiveVal = isTemp ? face.temporarySticker!.baseValue : face.baseValue;
                const effectiveElem = isTemp ? face.temporarySticker!.element : face.element;
                const effectiveSpec = isTemp ? face.temporarySticker!.special : face.special;

                return (
                  <div
                    key={face.id || idx}
                    className={`inspect-face-box ${isTemp ? 'has-sticker' : ''}`}
                  >
                    <div className="face-box-top">
                      <span className="face-idx">第 {idx + 1} 面</span>
                      {isTemp && (
                        <span className="sticker-badge">
                          一次性覆蓋
                        </span>
                      )}
                    </div>

                    <div className="face-box-center">
                      <span className="val-num">{effectiveVal}</span>
                      <div className="elem-badge-wrap">{getElementBadge(effectiveElem)}</div>
                    </div>

                    <div className="face-box-bottom">
                      {isTemp ? (
                        <span className="orig-text">原面: {face.baseValue} {face.element}</span>
                      ) : (
                        <span>永久骰面</span>
                      )}
                      {effectiveSpec && effectiveSpec !== 'none' && (
                        <span className="desc-text">
                          {effectiveSpec}
                        </span>
                      )}
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
