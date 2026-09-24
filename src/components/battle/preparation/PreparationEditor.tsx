import { useState } from 'react';
import { DiceNet } from '../../dice/DiceNet';
import { DiceTabs } from '../../dice/DiceTabs';
import { ConsumableBar } from '../../stickers/ConsumableBar';
import { ARROW_CONFIG, ARROW_IDS } from '../../../configs/directionalStickerConfig';
import type { usePreparation } from './usePreparation';

export function PreparationEditor({ preparation: p }: { preparation: ReturnType<typeof usePreparation> }) {
  const [touchInput, setTouchInput] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  return <div className="preparation-editor" onPointerDown={(event) => {
    setTouchInput(event.pointerType === 'touch' || event.pointerType === 'pen');
  }} onContextMenu={(event) => {
    if (p.directional) { event.preventDefault(); p.rotate(); }
  }} onKeyDown={(event) => {
    if (event.key === 'Escape') { event.preventDefault(); p.cancel(); }
    if (p.directional && event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); if (!event.repeat) p.rotate();
    }
  }}>
    <ConsumableBar selectedId={p.selectedId} onSelect={p.select} placements={p.placements}
      dicePool={p.dicePool} onWithdraw={p.withdraw} />
    <div className="preparation-editor-tools">
      <span>{p.selected ? `${p.selected.name}・預覽尚未套用` : '選擇臨時貼紙，或直接進入戰鬥'}</span>
      {p.directional && <div className="preparation-directions" role="group" aria-label="翻面方向">
        {ARROW_IDS.map((id) => <button key={id} type="button" aria-pressed={p.direction === id}
          aria-label={ARROW_CONFIG[id].name} onClick={() => p.setDirection(id)}>{ARROW_CONFIG[id].glyph}</button>)}
        <span>{touchInput ? '選方向，再貼到預覽面' : '右鍵／R 旋轉・左鍵／Enter 貼上'}</span>
      </div>}
      {p.selected && <button type="button" onClick={p.cancel}>取消選取</button>}
      {touchInput && p.selected && <button type="button" onClick={() => p.apply(p.faceIndex!)}
        disabled={p.faceIndex === null || Boolean(p.placementError(p.faceIndex))}>貼到此面</button>}
    </div>
    <DiceTabs dicePool={p.previewPool} selectedDiceId={p.die.id} onSelect={p.chooseDie} />
    <DiceNet key={p.die.id} dice={p.die} sticker={p.sticker} placementError={p.placementError}
      onApplyFace={p.selected ? p.apply : undefined} previewFaceIndex={p.faceIndex}
      onPreviewFaceChange={p.setFaceIndex} previewOnly={touchInput} />
  </div>;
}
