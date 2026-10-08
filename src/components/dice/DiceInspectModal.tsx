import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { StickerEditor } from '../stickers/editor/StickerEditor';
import { Dices, X } from 'lucide-react';

interface DiceInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiceInspectModal: React.FC<DiceInspectModalProps> = ({ isOpen, onClose }) => {
  const dicePool = useGameStore((state) => state.dicePool);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    return () => opener.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay dice-net-overlay dice-inspect-overlay"
      onKeyDown={(event) => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); } }}>
      <div className="dice-net-dialog" role="dialog" aria-modal="true" aria-labelledby="dice-inspect-title">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge">
              <Dices className="ui-icon" />
            </div>
            <div className="modal-title-box">
              <div className="modal-title" id="dice-inspect-title">骰池與貼紙背包</div>
              <div className="modal-subtitle">目前持有 {dicePool.length} 顆骰子，戰鬥外可自由配置貼紙</div>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className="modal-close-btn"
            aria-label="關閉骰面檢視"
          >
            <X className="ui-icon" />
          </button>
        </div>

        <StickerEditor onBusyChange={setBusy} />
      </div>
    </div>
  );
};
