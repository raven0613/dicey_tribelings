import React from 'react';
import { PackagePlus } from 'lucide-react';
import { INVENTORY_CONFIG } from '../../configs/inventoryConfig';
import { useGameStore } from '../../store/gameStore';
import { StickerElementBadge } from './StickerElementBadge';

export const ConsumableReplacementModal: React.FC = () => {
  const {
    stickerFlow,
    pendingShopSticker,
    consumableStickers,
    storeCurrentConsumable,
    replaceCurrentConsumable,
    discardCurrentSticker,
    confirmShopSticker,
    replaceShopSticker,
    cancelShopSticker,
  } = useGameStore();
  const flowSticker = stickerFlow?.items[stickerFlow.index];
  const isFlow = Boolean(flowSticker?.isDisposable);
  const sticker = isFlow ? flowSticker : pendingShopSticker?.sticker;
  if (!sticker) return null;

  const hasSpace = consumableStickers.length < INVENTORY_CONFIG.consumableCapacity;
  const acceptEmpty = isFlow ? storeCurrentConsumable : confirmShopSticker;
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
                {hasSpace ? '選擇空欄位收納，或放棄新貼紙。' : '消耗品欄已滿，選擇一張舊貼紙取代，或放棄新貼紙。'}
              </div>
            </div>
          </div>
        </div>

        <div className="incoming-item-card">
          <strong>{sticker.baseValue}</strong>
          <div><h3>{sticker.name}</h3><StickerElementBadge element={sticker.element} /></div>
          <p>{sticker.description}</p>
          {pendingShopSticker && <span className="price-note">確認後支付 {pendingShopSticker.cost} 金幣</span>}
        </div>

        <div className="replacement-slots">
          {consumableStickers.map((item) => (
            <button type="button" key={item.instanceId} onClick={() => replace(item.instanceId)}>
              <span>取代</span><strong>{item.baseValue}</strong><span>{item.name}</span>
            </button>
          ))}
          {hasSpace && (
            <button type="button" className="empty-choice" onClick={acceptEmpty}>
              <span>放入</span><strong>＋</strong><span>空欄位</span>
            </button>
          )}
        </div>
        <button type="button" className="btn-secondary-modal" onClick={cancel}>
          {isFlow ? '放棄新貼紙' : '取消購買'}
        </button>
      </div>
    </div>
  );
};
