import { Flame } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { CAMP_BUFFS } from '../../configs/campConfig';
import { useGameStore } from '../../store/gameStore';
import { useSkillTooltip } from '../common/useSkillTooltip';

export function CampBuffBadge() {
  const { id, round, enemies } = useGameStore(useShallow(state => ({
    id: state.campBuff, round: state.creatureBattleState.round, enemies: state.enemies.length,
  })));
  const buff = id ? CAMP_BUFFS[id] : null;
  const expired = buff && 'rounds' in buff && enemies > 0 && round > buff.rounds;
  const { tooltip, tooltipProps } = useSkillTooltip(buff?.description ?? '');
  if (!buff) return null;
  return <span className="battle-status-badge" tabIndex={0} {...tooltipProps}>
    <Flame className="ui-icon" />{buff.name}{expired ? '（已用畢）' : enemies === 0 ? '（下一場）' : ''}{tooltip}
  </span>;
}
