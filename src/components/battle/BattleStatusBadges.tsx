import { useShallow } from 'zustand/react/shallow';
import type { Equipment } from '../../types/game';
import { getEquipmentIcon } from '../equipment/equipmentIcons';
import { Crosshair, LockKeyhole } from 'lucide-react';
import { useSkillTooltip } from '../common/useSkillTooltip';
import { useGameStore } from '../../store/gameStore';

export function ExposureBadge({ multiplier, before, after }: { multiplier: number; before?: number; after?: number }) {
  const { tooltip, tooltipProps } = useSkillTooltip(`暴露弱點：受到傷害 ×${multiplier}。${before !== undefined ? `本輪傷害 ${before} → ${after}，已計入逐段修正。` : ''}`);
  return <span className="battle-status-badge exposure-badge" tabIndex={0} {...tooltipProps}>
    <Crosshair className="ui-icon" />弱點 ×{multiplier}{tooltip}
  </span>;
}

export function DieStatusBadge({ sealed, damage, breakDamage, watched }: { sealed?: boolean; damage?: number; breakDamage?: number; watched?: boolean }) {
  const { tooltip, tooltipProps } = useSkillTooltip(watched ? '本回合普通攻擊減半。玩家主動重骰哪顆就改盯哪顆，重骰這顆則繼續被盯防；自動連鎖維持原目標，技能、追加及再攻擊照常。' : sealed ? '本回合無法重骰或翻面。'
    : `額外重骰此骰，或本輪對鉤索來源造成 ${breakDamage} 傷害可解除；剩餘 ${damage} 拉扯傷害可用護盾吸收。`);
  return <span className="battle-status-badge die-status-badge" tabIndex={0} {...tooltipProps}
    aria-label={watched ? '盯防' : sealed ? '重骰封鎖' : '鉤索'}>
    {watched ? <Crosshair className="ui-icon" /> : sealed ? <LockKeyhole className="ui-icon" /> : <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="16" cy="4" r="2" /><path d="M16 6v10a6 6 0 0 1-12 0v-5l4 4" /></svg>}{tooltip}
  </span>;
}

export function RationsBadge() {
  const { initialRations, dicePool, equipments, setHoveredEquipment } = useGameStore(useShallow((state) => ({
    initialRations: state.creatureBattleState.initialRations,
    dicePool: state.dicePool,
    equipments: state.equipments,
    setHoveredEquipment: state.setHoveredEquipment,
  })));
  const equipment = equipments.find(item => item.ruleId === 'RATIONS');
  const amount = Object.values(initialRations).reduce((sum, value) => sum + value, 0);
  const allocations = dicePool.flatMap((die, index) => initialRations[die.id]
    ? [`第 ${index + 1} 骰・${die.name}：初始存糧 +${initialRations[die.id]}`] : []);
  const { tooltip, tooltipProps } = useSkillTooltip(`${equipment?.name ?? ''}：本場已分配 ${amount} 初始存糧。\n${allocations.join('\n')}`);
  if (!equipment || amount <= 0) return null;
  const Icon = getEquipmentIcon(equipment.iconName);
  return <span className="battle-status-badge rations-badge" tabIndex={0} {...tooltipProps}
    onMouseEnter={(event) => { tooltipProps.onMouseEnter(event); setHoveredEquipment(equipment.id); }}
    onMouseLeave={() => { tooltipProps.onMouseLeave(); setHoveredEquipment(null); }}
    onFocus={(event) => { tooltipProps.onFocus(event); setHoveredEquipment(equipment.id); }}
    onBlur={() => { tooltipProps.onBlur(); setHoveredEquipment(null); }} aria-label={`${equipment.name} ${amount}`}>
    <Icon className="ui-icon" />{amount}{tooltip}
  </span>;
}

export function RationsAllocation({ equipment, amount }: { equipment: Equipment; amount: number }) {
  const { tooltip, tooltipProps } = useSkillTooltip(`${equipment.name}：本骰初始存糧 +${amount}`);
  const Icon = getEquipmentIcon(equipment.iconName);
  return <span className="rations-allocation" tabIndex={0} {...tooltipProps}>
    <Icon className="ui-icon" /> + {amount}{tooltip}
  </span>;
}
