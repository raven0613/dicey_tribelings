import { MaterialBadge, materialStyle } from '../dice/MaterialBadge';
import { getEffectiveFace } from '../../service/dice/diceFaces';
import { SkillText } from '../common/SkillText';
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { CreatureBadge } from '../dice/CreatureBadge';
import { DiceNet } from '../dice/DiceNet';
import { DiceTabs } from '../dice/DiceTabs';

export const StickerApplierModal: React.FC = () => {
  const { stickerFlow, dicePool, applyCurrentPermanentSticker, discardCurrentSticker } = useGameStore();
  const [selectedDiceId, setSelectedDiceId] = useState(dicePool[0]?.id ?? '');
  const sticker = stickerFlow?.items[stickerFlow.index];

  if (!stickerFlow || !sticker || sticker.isDisposable === true) return null;
  const currentDie = dicePool.find((die) => die.id === selectedDiceId) ?? dicePool[0];

  return (
    <div className="modal-overlay dice-net-overlay">
      <div className="dice-net-dialog sticker-applier-card" role="dialog" aria-modal="true" aria-labelledby="sticker-applier-title">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge"><Sparkles size={20} /></div>
            <div className="modal-title-box">
              <div className="modal-title" id="sticker-applier-title">永久貼紙改造</div>
              <div className="modal-subtitle">
                第 {stickerFlow.index + 1}/{stickerFlow.items.length} 張・選擇骰面立即覆蓋
              </div>
            </div>
          </div>
          <button type="button" onClick={discardCurrentSticker} className="btn-skip-reward">放棄貼紙</button>
        </div>

        <div className="sticker-overview" data-material={sticker.material} style={materialStyle(sticker.material)}>
          <div className="sticker-overview-identity">
            <CreatureBadge creature={sticker.creature} size={24} />
            <strong className="sticker-overview-value">{getEffectiveFace(sticker).baseValue}</strong>
          </div>
          <div className="sticker-overview-info">
            <strong>{sticker.name}</strong><MaterialBadge material={sticker.material} description /><p><SkillText text={sticker.description} /></p>
          </div>
        </div>

        <DiceTabs dicePool={dicePool} selectedDiceId={currentDie?.id} onSelect={setSelectedDiceId} />
        {currentDie && <div className="dice-net-body">
          <DiceNet key={currentDie.id} dice={currentDie} sticker={sticker}
            onApplyFace={(faceIndex) => applyCurrentPermanentSticker(currentDie.id, faceIndex)} />
        </div>}
      </div>
    </div>
  );
};
