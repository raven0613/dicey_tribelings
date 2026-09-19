import { useShallow } from 'zustand/react/shallow';
import type { Equipment } from '../../types/game';
import { getEquipmentIcon } from '../equipment/equipmentIcons';
import { Crosshair, LockKeyhole } from 'lucide-react';
import { useSkillTooltip } from '../common/useSkillTooltip';
import { useGameStore } from '../../store/gameStore';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';

export function ExposureBadge({ multiplier, before, after }: { multiplier: number; before?: number; after?: number }) {
  const { tooltip, tooltipProps } = useSkillTooltip(`暴露弱點：受到傷害 ×${multiplier}。${before !== undefined ? `本輪傷害 ${before} → ${after}，已計入逐段修正。` : ''}`);
  return <span className="battle-status-badge exposure-badge" tabIndex={0} {...tooltipProps}>
    <Crosshair size={15} />弱點 ×{multiplier}{tooltip}
  </span>;
}

export function DieStatusBadge({ sealed, damage }: { sealed?: boolean; damage?: number }) {
  const { tooltip, tooltipProps } = useSkillTooltip(sealed ? '本回合無法重骰或翻面。'
    : `重骰此骰可解除鉤索，否則受到 ${damage} 拉扯傷害。`);
  return <span className="battle-status-badge die-status-badge" tabIndex={0} {...tooltipProps}
    aria-label={sealed ? '重骰封鎖' : '鉤索'}>
    {sealed ? <LockKeyhole size={18} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="16" cy="4" r="2" /><path d="M16 6v10a6 6 0 0 1-12 0v-5l4 4" /></svg>}{tooltip}
  </span>;
}

export function RationsBadge() {
  const { comboSummary, creatureBattleState, combatPhase, equipments, setHoveredEquipment, virtualFood } = useGameStore(useShallow((state) => ({
    comboSummary: state.comboSummary,
    creatureBattleState: state.creatureBattleState,
    combatPhase: state.combatPhase,
    equipments: state.equipments,
    setHoveredEquipment: state.setHoveredEquipment,
    virtualFood: state.displayedFood['virtual-food']?.displayValue,
  })));
  const equipment = equipments.find((item) => item.ruleId === 'RATIONS');
  const amount = combatPhase === 'CONTROL_PHASE' ? comboSummary?.virtualFood ?? 0
    : combatPhase === 'RESOLVING_CALCULATION' ? virtualFood ?? creatureBattleState.virtualFood : 0;
  const allocations = comboSummary?.events.filter((event) => equipment && event.equipmentId === equipment.id)
    .flatMap((event) => event.changes.filter((change) => change.kind === 'food').map((change) => {
      const index = comboSummary.items.findIndex((item) => item.diceId === change.targetId);
      return `第 ${index + 1} 骰・${CREATURE_CONFIG[comboSummary.items[index].creature].name}：儲糧 +${change.after - change.before}`;
    })) ?? [];
  const { tooltip, tooltipProps } = useSkillTooltip(`${equipment?.name ?? ''}：${amount} 點，視為一份食物，本回合有效。\n含廚師面的骰子平均分配：\n${allocations.length ? allocations.join('\n') : '本輪沒有可入庫對象或容量。'}`);
  if (!equipment || amount <= 0) return null;
  const Icon = getEquipmentIcon(equipment.iconName);
  return <span className="battle-status-badge rations-badge" tabIndex={0} {...tooltipProps}
    onMouseEnter={(event) => { tooltipProps.onMouseEnter(event); setHoveredEquipment(equipment.id); }}
    onMouseLeave={() => { tooltipProps.onMouseLeave(); setHoveredEquipment(null); }}
    onFocus={(event) => { tooltipProps.onFocus(event); setHoveredEquipment(equipment.id); }}
    onBlur={() => { tooltipProps.onBlur(); setHoveredEquipment(null); }} aria-label={`${equipment.name} ${amount}`}>
    <Icon size={18} />{amount}{tooltip}
  </span>;
}

export function RationsAllocation({ equipment, amount }: { equipment: Equipment; amount: number }) {
  const { tooltip, tooltipProps } = useSkillTooltip(`${equipment.name}：本骰儲糧 +${amount}`);
  const Icon = getEquipmentIcon(equipment.iconName);
  return <span className="rations-allocation" tabIndex={0} {...tooltipProps}>
    <Icon size={13} /> + {amount}{tooltip}
  </span>;
}
