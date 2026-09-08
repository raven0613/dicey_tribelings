import { SkillText } from '../common/SkillText';
import React from 'react';
import { PackagePlus } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { CreatureBadge } from '../dice/CreatureBadge';

export const ConsumableReplacementModal: React.FC = () => {
  const {
    stickerFlow,
    pendingShopSticker,
    consumableStickers,
    replaceCurrentConsumable,
    discardCurrentSticker,
    replaceShopSticker,
    cancelShopSticker,
  } = useGameStore();
  const flowSticker = stickerFlow?.items[stickerFlow.index];
  const isFlow = Boolean(flowSticker?.isDisposable);
  const sticker = isFlow ? flowSticker : pendingShopSticker?.sticker;
  if (!sticker) return null;

  const replace = isFlow ? replaceCurrentConsumable : replaceShopSticker;
  const cancel = isFlow ? discardCurrentSticker : cancelShopSticker;

  return (
    <div className="modal-overlay">
      <div className="replacement-card">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge"><PackagePlus size={20} /></div>
            <div className="modal-title-box">
              <div className="modal-title">取得戰術貼紙</div>
              <div className="modal-subtitle">
                消耗品欄已滿，選擇一張舊貼紙取代，或放棄新貼紙。
              </div>
            </div>
          </div>
        </div>

        <div className="incoming-item-card">
          <strong>本場補組合</strong>
          <div><h3>{sticker.name}</h3><CreatureBadge creature={sticker.creature} /></div>
          <p><SkillText text={sticker.description} /></p>
          {pendingShopSticker && <span className="price-note">確認後支付 {pendingShopSticker.cost} 金幣</span>}
        </div>

        <div className="replacement-slots">
          {consumableStickers.map((item) => (
            <button type="button" key={item.instanceId} onClick={() => replace(item.instanceId)}>
              <span>取代</span><span>{item.name}</span>
            </button>
          ))}

        </div>
        <button type="button" className="btn-secondary-modal" onClick={cancel}>
          {isFlow ? '放棄新貼紙' : '取消購買'}
        </button>
      </div>
    </div>
  );
};
