import { useEffect, useId, useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { ARROW_CONFIG, ARROW_IDS } from '../../../configs/directionalStickerConfig';
import { BACKPACK_PRESENTATION, INVENTORY_CONFIG } from '../../../configs/inventoryConfig';
import { getFaceSticker } from '../../../service/inventory/stickerInstances';
import { getGameRect } from '../../../service/layout/gameViewport';
import { DiceNet } from '../../dice/DiceNet';
import { DiceTabs } from '../../dice/DiceTabs';
import { useGameViewport } from '../../layout/GameViewportContext';
import { StickerOverview } from '../StickerOverview';
import { StickerTransfer, stickerCenter, type StickerFlight } from '../StickerTransfer';
import { useStickerEditor } from './useStickerEditor';
import { useStickerDrag } from './useStickerDrag';
import { BackpackPanel } from './BackpackPanel';
import { FaceContextMenu, type FaceMenuTarget } from './FaceContextMenu';
import { backpackTarget } from './backpackTarget';
import type { OwnedSticker } from '../../../types/game';

export function StickerEditor({
  incoming,
  onBusyChange,
}: {
  incoming?: OwnedSticker;
  onBusyChange?: (busy: boolean) => void;
}) {
  const p = useStickerEditor(incoming);
  const drag = useStickerDrag(p);
  const id = useId();
  const { scale, mobile } = useGameViewport();
  const [menu, setMenu] = useState<FaceMenuTarget | null>(null);
  const [flight, setFlight] = useState<StickerFlight | null>(null);
  useEffect(() => {
    onBusyChange?.(Boolean(flight));
  }, [flight, onBusyChange]);
  const placement =
    menu &&
    p.placements.find((item) => item.diceId === p.die.id && item.faceIndex === menu.faceIndex);
  const menuSticker =
    menu &&
    (placement?.consumable ??
      getFaceSticker(p.dicePool.find((die) => die.id === p.die.id)!.faces[menu.faceIndex]));
  const disabledReason = !menuSticker
    ? '白板沒有可取下的貼紙。'
    : !placement && p.permanents.length >= INVENTORY_CONFIG.permanentCapacity
      ? BACKPACK_PRESENTATION.fullMessage
      : undefined;
  const take = () => {
    if (!menu || !menuSticker || disabledReason) return;
    const section = document.querySelector<HTMLElement>(
      `[data-backpack-section="${id}-${placement ? 'temporary' : 'permanent'}"]`,
    )!;
    const { point, cleanup } = backpackTarget(
      section,
      placement ? p.consumables : p.permanents,
      menuSticker,
      useGameStore.getState().stickerSort,
    );
    const index = menu.faceIndex,
      diceId = p.die.id;
    const source = menu.element.querySelector<HTMLElement>('.dice-net-copies')!;
    setFlight({
      creature: menuSticker.creature,
      source,
      start: stickerCenter(menu.element),
      target: point,
      arrive: () => {
        useGameStore.getState().takeFaceSticker(diceId, index);
        cleanup();
        setFlight(null);
        p.cancel();
      },
    });
    setMenu(null);
  };
  return (
    <div
      className={`sticker-editor ${flight ? 'is-transferring' : ''}`}
      {...drag.rootBindings}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && (menu || p.selected)) {
          event.stopPropagation();
          setMenu(null);
          p.cancel();
        }
        if (
          p.directional &&
          p.selection?.kind !== 'face' &&
          event.key.toLowerCase() === 'r' &&
          !event.repeat &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          p.rotate();
        }
      }}
    >
      {incoming && (
        <StickerOverview
          sticker={incoming}
          dragProps={{
            ...drag.bindings({ kind: 'incoming', id: incoming.instanceId }),
            disabled: Boolean(flight),
            onClick: () => p.select(incoming.instanceId),
          }}
        />
      )}
      <div className="sticker-editor-content" inert={Boolean(flight)}>
        <div className="preparation-editor">
          <div className="preparation-editor-tools">
            <span role="status">
              {p.error || (p.selected ? `${p.selected.name}・選擇目標骰面` : '配置骰面與貼紙背包')}
            </span>
            {p.matchCounts && (
              <span className="sticker-match-summary">
                同名土人：{Object.values(p.matchCounts).reduce((sum, count) => sum + count, 0)} 面・
                {Object.values(p.matchCounts).filter(Boolean).length} 顆骰子
              </span>
            )}
            {p.directional && p.selection?.kind !== 'face' && (
              <div className="preparation-directions" role="group" aria-label="翻面方向">
                {ARROW_IDS.map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    aria-pressed={p.direction === direction}
                    aria-label={ARROW_CONFIG[direction].name}
                    onClick={() => p.setDirection(direction)}
                  >
                    {ARROW_CONFIG[direction].glyph}
                  </button>
                ))}
                <span>方向按鈕／R 旋轉</span>
              </div>
            )}
            {p.selected && (
              <button type="button" onClick={p.cancel}>
                取消選取
              </button>
            )}
            {mobile && p.editable && p.faceIndex !== null && (
              <button
                type="button"
                onClick={(event) => {
                  const face = event.currentTarget
                    .closest('.preparation-editor')!
                    .querySelector<HTMLElement>(`[data-sticker-face="${p.faceIndex}"]`)!;
                  const rect = getGameRect(face);
                  setMenu({ x: rect.left, y: rect.bottom, faceIndex: p.faceIndex!, element: face });
                }}
              >
                骰面選單
              </button>
            )}
          </div>
          <DiceTabs
            dicePool={p.previewPool}
            matchCounts={p.matchCounts}
            selectedDiceId={p.die.id}
            onSelect={(dieId) => {
              setMenu(null);
              p.chooseDie(dieId);
            }}
          />
          <DiceNet
            key={p.die.id}
            dice={p.die}
            dicePool={p.previewPool}
            sticker={p.sticker}
            highlightCreature={p.directional ? undefined : p.sticker?.creature}
            placementError={p.placementError}
            onApplyFace={p.editable && p.selected ? p.apply : undefined}
            previewFaceIndex={p.faceIndex}
            onPreviewFaceChange={p.setFaceIndex}
            faceDragBindings={
              p.editable
                ? (index) =>
                    drag.bindings({
                      kind: 'face',
                      diceId: p.die.id,
                      faceIndex: index,
                    })
                : undefined
            }
            onFaceContextMenu={
              p.editable
                ? (event, faceIndex) => {
                    event.preventDefault();
                    event.stopPropagation();
                    p.setFaceIndex(null);
                    const stage = document.getElementById('game-stage')!.getBoundingClientRect();
                    const rect = getGameRect(event.currentTarget);
                    setMenu({
                      x: event.clientX ? (event.clientX - stage.left) / scale : rect.left,
                      y: event.clientY ? (event.clientY - stage.top) / scale : rect.bottom,
                      faceIndex,
                      element: event.currentTarget,
                    });
                  }
                : undefined
            }
          />
        </div>
        <BackpackPanel p={p} drag={drag} id={id} />
      </div>
      {menu && (
        <FaceContextMenu
          target={menu}
          disabledReason={disabledReason}
          onTake={take}
          onClose={() => setMenu(null)}
        />
      )}
      {flight && <StickerTransfer flight={flight} />}
      {drag.ghost}
    </div>
  );
}
