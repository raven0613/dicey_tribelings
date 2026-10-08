import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/gameStore';
import { StickerEditor } from './editor/StickerEditor';
import { StickerBadge } from './StickerBadge';
import { MaterialBadge, materialStyle } from '../dice/MaterialBadge';
import { RarityBadge } from '../dice/RarityBadge';
import { SkillText } from '../common/SkillText';
import { DiceInspectModal } from '../dice/DiceInspectModal';
import { BACKPACK_PRESENTATION, INVENTORY_CONFIG } from '../../configs/inventoryConfig';
import { StickerTransfer, stickerCenter, type StickerFlight } from './StickerTransfer';

export function StickerApplierModal() {
  const state = useGameStore(
    useShallow((s) => ({
      flow: s.stickerFlow,
      choose: s.chooseFlowSticker,
      back: s.returnToStickerSelection,
      discard: s.discardStickerAt,
      skip: s.skipStickerFlow,
      store: s.storeFlowSticker,
      permanentCount: s.permanentStickers.length,
    })),
  );
  const [flight, setFlight] = useState<StickerFlight | null>(null);
  const [editingBag, setEditingBag] = useState(false);
  const [busy, setBusy] = useState(false);
  const flow = state.flow;
  if (!flow) return null;
  const sticker = flow.items[flow.index];
  if (flow.editing)
    return (
      <div
        className="modal-overlay dice-net-overlay"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) {
            event.stopPropagation();
            state.back();
          }
        }}
      >
        <div
          className="dice-net-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="incoming-sticker-title"
        >
          <header className="modal-header">
            <div className="modal-header-left">
              <div className="modal-title-box">
                <h2 className="modal-title" id="incoming-sticker-title">
                  {sticker?.name ?? '貼紙配置'}
                </h2>
                <p className="modal-subtitle">
                  {!sticker ? '可繼續整理骰面與背包，完成後繼續。' : sticker.isDisposable
                    ? '預先配置到下一場，開戰才消耗。'
                    : '貼上後，原永久貼紙自動回背包。'}
                </p>
              </div>
            </div>
            <button type="button" className="btn-skip-reward" disabled={busy} onClick={state.back}>
              完成配置
            </button>
          </header>
          <StickerEditor incoming={sticker} onBusyChange={setBusy} />
        </div>
      </div>
    );
  const gold = !flow.usedAny ? (flow.rewardGold ?? 0) : 0;
  return (
    <>
      <div className="modal-overlay">
        <div
          className="pack-result-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sticker-selection-title"
          inert={Boolean(flight) || editingBag}
        >
          <div className="modal-header">
            <div className="modal-header-left">
              <div className="modal-title-box">
                <h2 className="modal-title" id="sticker-selection-title">
                  取得貼紙
                </h2>
                <p className="modal-subtitle">
                  剩餘 {flow.items.length} 張，選擇收進背包或直接貼。
                </p>
              </div>
            </div>
            <button type="button" className="btn-view-dice" onClick={() => setEditingBag(true)}>
              整理背包
            </button>
          </div>
          <div className="pack-sticker-grid">
            {flow.items.map((item, index) => {
              const full =
                !item.isDisposable && state.permanentCount >= INVENTORY_CONFIG.permanentCapacity;
              return (
                <article
                  className="pack-sticker-card sticker-selection-card"
                  key={item.instanceId}
                  data-material={item.isDisposable === false ? item.material : undefined}
                  style={materialStyle(item.isDisposable === false ? item.material : undefined)}
                >
                  <div className="card-tag-row">
                    <StickerBadge creature={item.creature} />
                    <RarityBadge rarity={item.rarity} />
                  </div>
                  <h3>{item.name}</h3>
                  {item.isDisposable === false && (
                    <MaterialBadge material={item.material} description />
                  )}
                  <p>
                    <SkillText text={item.description} />
                  </p>
                  {full && <p role="status">{BACKPACK_PRESENTATION.fullMessage}</p>}
                  <div className="sticker-selection-actions">
                    <button
                      type="button"
                      className="btn-secondary-modal"
                      disabled={full}
                      onClick={(event) => {
                        const source = event.currentTarget
                          .closest('article')!
                          .querySelector<HTMLElement>('.card-tag-row')!;
                        const target = document.getElementById('btn-dice-bag')!;
                        setFlight({
                          creature: item.creature,
                          source,
                          start: stickerCenter(source),
                          target: stickerCenter(target),
                          arrive: () => {
                            state.store(index);
                            setFlight(null);
                          },
                        });
                      }}
                    >
                      收進背包
                    </button>
                    <button
                      type="button"
                      className="btn-primary-modal"
                      onClick={() => state.choose(index)}
                    >
                      直接貼
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-skip-reward"
                    onClick={() => state.discard(index)}
                  >
                    放棄這張
                  </button>
                </article>
              );
            })}
          </div>
          <div className="sticker-selection-footer">
            <button type="button" className="btn-skip-reward" onClick={state.skip}>
              {gold ? `全部放棄並獲得 ${gold} 金幣` : '放棄剩餘貼紙並繼續'}
            </button>
          </div>
        </div>
      </div>
      {flight && <StickerTransfer flight={flight} />}
      <DiceInspectModal isOpen={editingBag} onClose={() => setEditingBag(false)} />
    </>
  );
}
