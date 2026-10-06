import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Dice, PermanentSticker } from '../../types/game';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getEffectiveFace } from '../../service/dice/diceFaces';
import { MaterialBadge, materialStyle } from '../dice/MaterialBadge';
import { CreatureBadge } from '../dice/CreatureBadge';
import { RarityBadge } from '../dice/RarityBadge';
import { DiceNet } from '../dice/DiceNet';
import { DiceTabs } from '../dice/DiceTabs';
import { SkillText } from '../common/SkillText';
import { Sparkles } from 'lucide-react';

interface StickerPlacementDialogProps {
  sticker: PermanentSticker;
  dicePool: Dice[];
  subtitle: string;
  exitLabel: string;
  onExit: () => void;
  onApply?: (diceId: string, faceIndex: number) => void;
  footer?: ReactNode;
}

export function StickerPlacementDialog({ sticker, dicePool, subtitle, exitLabel, onExit, onApply, footer }: StickerPlacementDialogProps) {
  const matchCounts = useMemo(() => Object.fromEntries(dicePool.map((die) => [die.id,
    die.faces.filter((face) => getEffectiveFace(face).creature === sticker.creature).length])), [dicePool, sticker.creature]);
  const [selectedDiceId, setSelectedDiceId] = useState(() =>
    dicePool.find((die) => matchCounts[die.id] > 0)?.id ?? dicePool[0]?.id ?? '');
  const currentDie = dicePool.find((die) => die.id === selectedDiceId) ?? dicePool[0];
  const exitRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement;
    exitRef.current?.focus();
    return () => opener.focus();
  }, []);

  return (
    <div className="modal-overlay dice-net-overlay" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onExit(); }
    }}>
      <div className="dice-net-dialog sticker-applier-card" role="dialog" aria-modal="true" aria-labelledby="sticker-applier-title">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge"><Sparkles className="ui-icon" /></div>
            <div className="modal-title-box">
              <div className="modal-title" id="sticker-applier-title">{onApply ? '永久貼紙改造' : '貼紙配置預覽'}</div>
              <div className="modal-subtitle">
                {subtitle}
              </div>
            </div>
          </div>
          <button type="button" ref={exitRef} onClick={onExit} className="btn-skip-reward">{exitLabel}</button>
        </div>

        <div className="sticker-overview" data-material={sticker.material} style={materialStyle(sticker.material)}>
          <div className="sticker-overview-identity">
            <CreatureBadge creature={sticker.creature} size={24} />
            <strong className="sticker-overview-value">沿用骰面點數</strong>
          </div>
          <div className="sticker-overview-info">
            <strong>{sticker.name}</strong><RarityBadge rarity={sticker.rarity} />
            <MaterialBadge material={sticker.material} description /><p><SkillText text={sticker.description} /></p>
          </div>
        </div>

        <p className="sticker-match-summary">{CREATURE_CONFIG[sticker.creature].name}：共 {Object.values(matchCounts).reduce((sum, count) => sum + count, 0)} 面・{Object.values(matchCounts).filter(Boolean).length} 顆骰子</p>
        <DiceTabs matchCounts={matchCounts} dicePool={dicePool} selectedDiceId={currentDie?.id} onSelect={setSelectedDiceId} />
        {currentDie && <div className="dice-net-body">
          <DiceNet key={currentDie.id} dice={currentDie} dicePool={dicePool} sticker={sticker} highlightCreature={sticker.creature}
            previewOnly={!onApply} onApplyFace={onApply ? faceIndex => onApply(currentDie.id, faceIndex) : undefined} />
        </div>}
        {footer}
      </div>
    </div>
  );
}
