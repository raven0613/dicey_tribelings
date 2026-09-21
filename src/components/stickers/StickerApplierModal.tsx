import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/gameStore';
import { StickerPlacementDialog } from './StickerPlacementDialog';

export function StickerApplierModal() {
  const { stickerFlow, dicePool, applyCurrentPermanentSticker, discardCurrentSticker } = useGameStore(useShallow((state) => ({
    stickerFlow: state.stickerFlow,
    dicePool: state.dicePool,
    applyCurrentPermanentSticker: state.applyCurrentPermanentSticker,
    discardCurrentSticker: state.discardCurrentSticker,
  })));
  const sticker = stickerFlow?.items[stickerFlow.index];
  if (!stickerFlow || !sticker || sticker.isDisposable === true) return null;

  return <StickerPlacementDialog key={`${stickerFlow.index}:${sticker.id}`} sticker={sticker} dicePool={dicePool}
    subtitle={`第 ${stickerFlow.index + 1}/${stickerFlow.items.length} 張・選擇骰面立即覆蓋`}
    exitLabel="放棄貼紙" onExit={discardCurrentSticker} onApply={applyCurrentPermanentSticker} />;
}
