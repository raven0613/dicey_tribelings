import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { BACKPACK_PRESENTATION, INVENTORY_CONFIG } from '../../../configs/inventoryConfig';
import { sortStickers } from '../../../service/inventory/stickerInstances';
import { StickerBadge } from '../StickerBadge';
import { MaterialBadge } from '../../dice/MaterialBadge';
import { SkillTooltip } from '../../common/SkillTooltip';
import type { useStickerEditor } from './useStickerEditor';
import type { useStickerDrag } from './useStickerDrag';

export function BackpackPanel({
  p,
  drag,
  id,
}: {
  p: ReturnType<typeof useStickerEditor>;
  drag: ReturnType<typeof useStickerDrag>;
  id: string;
}) {
  const reduced = useReducedMotion();
  const sort = useGameStore((state) => state.stickerSort);
  const setSort = useGameStore((state) => state.setStickerSort);
  const pending = useGameStore((state) => state.stickerFlow?.items);
  const groups = [
    {
      type: 'temporary',
      title: '臨時貼紙',
      capacity: INVENTORY_CONFIG.consumableCapacity,
      items: sortStickers(
        p.consumables.filter(
          (item) => !pending?.some((entry) => entry.instanceId === item.instanceId),
        ),
        sort,
      ).map((item) => ({ ...item, material: undefined })),
    },
    {
      type: 'permanent',
      title: '永久貼紙',
      capacity: INVENTORY_CONFIG.permanentCapacity,
      items: sortStickers(p.permanents, sort),
    },
  ];
  return (
    <aside
      className="sticker-backpack"
      data-sticker-backpack="true"
      aria-label="貼紙背包"
      style={
        {
          '--backpack-card-height': `${BACKPACK_PRESENTATION.cardHeight}px`,
          '--backpack-grid-gap': `${BACKPACK_PRESENTATION.gridGap}px`,
        } as CSSProperties
      }
    >
      <header>
        <h2>背包</h2>
        <div className="backpack-sort" role="group" aria-label="貼紙排序">
          <button type="button" aria-pressed={sort === 'name'} onClick={() => setSort('name')}>
            土人名稱
          </button>
          <button type="button" aria-pressed={sort === 'time'} onClick={() => setSort('time')}>
            取得時間
          </button>
        </div>
      </header>
      {groups.map((group) => (
        <section key={group.type} className={`backpack-section is-${group.type}`}>
          <h3>
            {group.title}
            <span>
              {group.type === 'temporary' ? p.consumables.length : group.items.length}／
              {group.capacity}
            </span>
          </h3>
          <div className="backpack-items" data-backpack-section={`${id}-${group.type}`}>
            <div className="backpack-grid">
              {group.items.map((item) => {
                const placed = p.placements.find(
                  (entry) => entry.consumable.instanceId === item.instanceId,
                );
                return (
                  <motion.article
                    layout="position"
                    transition={{ duration: reduced ? 0 : BACKPACK_PRESENTATION.layoutSeconds }}
                    className={`backpack-item ${placed ? 'is-placed' : ''}`}
                    key={item.instanceId}
                    data-backpack-item={item.instanceId}
                  >
                    <button
                      type="button"
                      className="backpack-sticker"
                      aria-pressed={p.selectedId === item.instanceId}
                      disabled={!p.editable}
                      {...drag.bindings({ kind: 'inventory', id: item.instanceId })}
                      onClick={(event) => {
                        if (event.detail === 0) p.select(item.instanceId);
                      }}
                    >
                      <SkillTooltip text={item.description}>
                        <StickerBadge creature={item.creature} showTooltip={false} />
                      </SkillTooltip>
                      <MaterialBadge material={item.material} />
                      {placed && <small>已配置・第 {placed.faceIndex + 1} 面</small>}
                    </button>
                    {p.editable && (
                      <button
                        type="button"
                        className="backpack-discard"
                        onClick={() => {
                          useGameStore.getState().discardInventorySticker(item.instanceId);
                          if (item.instanceId === p.selectedId) p.cancel();
                        }}
                      >
                        放棄
                      </button>
                    )}
                  </motion.article>
                );
              })}
            </div>
            {!group.items.length && <p className="backpack-empty">尚無貼紙</p>}
          </div>
        </section>
      ))}
      <p className="backpack-help">
        {p.editable
          ? '拖曳骰面貼紙移動或交換，拖回背包收納；右鍵骰面取下。'
          : '戰鬥中可查看貼紙，戰鬥結束後可替換。'}
      </p>
    </aside>
  );
}
