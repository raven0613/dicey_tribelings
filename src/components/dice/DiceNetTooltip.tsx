import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Dice, FaceSticker } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { describeFaceSkillPreview } from '../../service/dice/faceSkillPreview';
import { DiceNetContent } from './DiceNetContent';

/** Mounted only while the popover is open; previews never write to the game store. */
export function DiceNetTooltip({ dice, dicePool, faceIndex, sticker }: {
  dice: Dice; dicePool?: Dice[]; faceIndex: number; sticker?: FaceSticker;
}) {
  const context = useGameStore(useShallow(state => ({
    pool: state.dicePool, phase: state.combatPhase, round: state.creatureBattleState,
    rolled: state.rolledIndices, equipments: state.equipments,
    control: state.control, maxControl: state.maxControl, gold: state.gold,
    enemies: state.enemies, selectedEnemyId: state.selectedEnemyId, campBuff: state.campBuff,
  })));
  const lines = useMemo(() => {
    const pool = dicePool ?? context.pool;
    const owned = context.pool.some(item => item.id === dice.id);
    return describeFaceSkillPreview({ dice, dicePool: pool, faceIndex, sticker, state: context.round,
      combat: owned && context.phase === 'CONTROL_PHASE' && context.enemies.length > 0 ? {
        rolledIndices: context.rolled, equipments: context.equipments, battle: context,
      } : undefined,
    });
  }, [dice, dicePool, faceIndex, sticker, context]);
  return <DiceNetContent face={dice.faces[faceIndex]} sticker={sticker} full lines={lines} />;
}
