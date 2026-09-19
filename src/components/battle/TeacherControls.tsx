import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/gameStore';
import { teacherTargets } from '../../service/battle/rollService';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';

export function TeacherControls() {
  const state = useGameStore(useShallow((state) => ({
    combatPhase: state.combatPhase,
    diceAction: state.diceAction,
    dicePool: state.dicePool,
    creatureBattleState: state.creatureBattleState,
    setDiceAction: state.setDiceAction,
    activeRerollingIndex: state.activeRerollingIndex,
    rolledIndices: state.rolledIndices,
    control: state.control,
    maxControl: state.maxControl,
    gold: state.gold,
    equipments: state.equipments,
  })));
  if (state.combatPhase !== 'CONTROL_PHASE') return null;
  const selecting = state.diceAction.startsWith('teacher:');
  const teachers = state.dicePool.filter((die) => state.creatureBattleState.teachersAvailable.includes(die.id));
  if (!teachers.length) return null;

  return <div className="teacher-controls" aria-label="土人老師免費重骰"
    onKeyDown={(event) => { if (selecting && event.key === 'Escape') state.setDiceAction('reroll'); }}>
    {selecting ? <>
      <span role="status">選擇亮框中的最低值土人骰</span>
      <button type="button" onClick={() => state.setDiceAction('reroll')}>取消選擇</button>
    </> : teachers.map((die) => {
      const hasTargets = teacherTargets(state, die.id).length > 0;
      return <button key={die.id} type="button"
        disabled={state.activeRerollingIndex !== null || !hasTargets}
        onClick={() => state.setDiceAction(`teacher:${die.id}`)}>
        {CREATURE_CONFIG.teacher.emoji} 骰子 {state.dicePool.indexOf(die) + 1}・{hasTargets ? '老師免費重骰' : '沒有合法目標'}
      </button>;
    })}
  </div>;
}
