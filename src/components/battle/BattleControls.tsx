import { getPaidRerollCost } from '../../service/battle/rerollCost';
import { ExposureBadge } from './BattleStatusBadges';
import { buildAttackPlan } from '../../service/battle/attackPlan';
import { EQUIPMENT_ACTIONS } from '../../configs/equipment/equipmentActionConfig';
import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Play, Swords, RotateCcw, Shield, Coins } from 'lucide-react';
import { TeacherControls } from './TeacherControls';

interface BattleControlsProps {
  onResolve: () => void;
  isResolving: boolean;
}

export const BattleControls: React.FC<BattleControlsProps> = ({ onResolve, isResolving }) => {
  const { currentEnemy, equipments, setDiceAction, combatPhase, control, maxControl, comboSummary, activeRerollingIndex,
    confirmBattlePreparation, unlockedDiceNotification, stickerFlow, diceAction, hoveredEquipmentId, creatureBattleState, gold, pendingPaidRerollDiceId } = useGameStore();

  if (combatPhase === 'PREPARATION') return <div className="battle-controls first-roll-controls">
    <span>擲出骰子，開始救援！</span>
    <button type="button" className="btn-resolve" disabled={!!unlockedDiceNotification || !!stickerFlow}
      onClick={() => confirmBattlePreparation([])}><Play size={20} />擲骰</button>
  </div>;

  const paidCost = getPaidRerollCost(creatureBattleState.paidRerolls, equipments);
  const isControlPhase = combatPhase === 'CONTROL_PHASE';
  const selectingAction = diceAction !== 'reroll';
  const action = Object.values(EQUIPMENT_ACTIONS).find((item) => item.action === diceAction);
  const beforeExposure = isControlPhase && activeRerollingIndex === null && currentEnemy?.exposure && comboSummary ? buildAttackPlan(comboSummary, { ...currentEnemy, exposure: undefined }, equipments).reduce((sum, attack) => sum + attack.value, 0) : undefined;
  const canResolve = isControlPhase && activeRerollingIndex === null && !isResolving && !selectingAction && !pendingPaidRerollDiceId;
  const totalForecastDamage = comboSummary?.totalDamage || 0;
  const highlightShield = isControlPhase && equipments.some((equipment) => equipment.id === hoveredEquipmentId && equipment.ruleId === 'BARRICADE');
  const totalForecastShield = comboSummary?.totalShield || 0;
  let resolveLabel = '鎖定結果 • 結算攻擊';
  if (isResolving) resolveLabel = '結算連續撞擊中...';
  else if (activeRerollingIndex !== null) resolveLabel = '等待重骰落定...';
  else if (selectingAction) resolveLabel = '請選擇目標或取消';

  return (
    <div className="battle-controls">
      {/* Left: Control Points meter & Tips */}
      <div className="controls-left">
        <div className="control-meter-group" data-story-anchor="control">
          <div className="meter-icon-box">
            <RotateCcw style={{ width: '20px', height: '20px' }} />
          </div>
          <div className="meter-details">
            <div className="meter-label">戰術 Control</div>
            <div className="meter-dots">
              {Array.from({ length: maxControl }).map((_, i) => (
                <span
                  key={i}
                  className={`dot ${i < control ? 'active' : 'empty'}`}
                />
              ))}
              <span className="dots-text">
                {control}/{maxControl}
              </span>
            </div>
          </div>
        </div>

        <div className="tactics-tip">
          {selectingAction ? <span>{action ? `${action.label}・${action.cost} ${action.currency}` : '選擇老師目標'} <button type="button" onClick={() => setDiceAction('reroll')}>取消</button></span> : control > 0 ? (
            <span>點擊骰子重骰，調整本輪組合</span>
          ) : (
            <span className="paid-reroll-price">重骰：{paidCost}<Coins size={14} aria-label="金幣" />{gold < paidCost && '（金幣不足）'}</span>
          )}
        </div>
      </div>

      {/* Right: Damage Forecast & Main Resolve Button */}
      <div className="controls-right">
        {/* Forecast Badges */}
        <div className="forecast-group">
          <div className="forecast-dmg">
            <span>總傷害:</span>
            <span className="dmg-number">
              <Swords style={{ width: '16px', height: '16px', marginRight: '2px' }} />
              {totalForecastDamage} 傷
            </span>
            {isControlPhase && !!currentEnemy?.exposure && <ExposureBadge multiplier={currentEnemy.exposure} before={beforeExposure} after={totalForecastDamage} />}
          </div>
          <div className={`forecast-shield ${highlightShield ? 'is-highlighted' : ''}`} style={{ visibility: totalForecastShield > 0 ? 'visible' : 'hidden' }}>
            <Shield style={{ width: '12px', height: '12px', marginRight: '2px' }} />
            +{totalForecastShield} 護盾
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          id="btn-resolve-battle"
          onClick={onResolve}
          disabled={!canResolve}
          className="btn-resolve"
        >
          <Swords style={{ width: '16px', height: '16px' }} />
          <span>{resolveLabel}</span>
        </button>
      </div>
      <TeacherControls />
    </div>
  );
};
