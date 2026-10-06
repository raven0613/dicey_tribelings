import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/gameStore';
import { StickerPlacementDialog } from './StickerPlacementDialog';
import { CreatureBadge } from '../dice/CreatureBadge';
import { MaterialBadge, materialStyle } from '../dice/MaterialBadge';
import { RarityBadge } from '../dice/RarityBadge';
import { SkillText } from '../common/SkillText';

export function StickerApplierModal() {
  const state = useGameStore(useShallow(s => ({
    flow: s.stickerFlow, dice: s.dicePool, apply: s.applyCurrentPermanentSticker,
    choose: s.chooseFlowSticker, back: s.returnToStickerSelection,
    discard: s.discardStickerAt, skip: s.skipStickerFlow,
  })));
  const flow = state.flow;
  if (!flow) return null;
  const sticker = flow.items[flow.index];
  if (sticker?.isDisposable === false) return (
    <StickerPlacementDialog key={`${flow.index}:${sticker.id}`} sticker={sticker} dicePool={state.dice}
      subtitle={`剩餘 ${flow.items.length} 張・選擇骰面立即覆蓋`}
      exitLabel="返回選擇貼紙" onExit={state.back} onApply={state.apply} />
  );
  if (flow.index >= 0) return null;
  const gold = !flow.usedAny ? flow.rewardGold ?? 0 : 0;

  return <div className="modal-overlay">
    <div className="pack-result-card" role="dialog" aria-modal="true" aria-labelledby="sticker-selection-title">
      <div className="modal-header">
        <div>
          <h2 id="sticker-selection-title">獎勵已揭曉</h2>
          <p>剩餘 {flow.items.length} 張，自由選擇貼附順序。</p>
        </div>
      </div>
      <div className="pack-sticker-grid">
        {flow.items.map((item, index) => (
          <article className="pack-sticker-card sticker-selection-card" key={`${item.id}:${index}`}
            data-material={item.isDisposable === false ? item.material : undefined}
            style={materialStyle(item.isDisposable === false ? item.material : undefined)}>
            <div className="card-tag-row">
              <CreatureBadge creature={item.creature} size={32} />
              <RarityBadge rarity={item.rarity} />
            </div>
            <h3>{item.name}</h3>
            {item.isDisposable === false && <MaterialBadge material={item.material} description />}
            <p><SkillText text={item.description} /></p>
            <div className="sticker-selection-actions">
              <button type="button" className="btn-primary-modal" onClick={() => state.choose(index)}>使用貼紙</button>
              <button type="button" className="btn-skip-reward" onClick={() => state.discard(index)}>放棄這張</button>
            </div>
          </article>
        ))}
      </div>
      <div className="sticker-selection-footer">
        <button type="button" className="btn-skip-reward" onClick={state.skip}>
          {gold ? `全部放棄並獲得 ${gold} 金幣` : '放棄剩餘貼紙並繼續'}
        </button>
      </div>
    </div>
  </div>;
}
