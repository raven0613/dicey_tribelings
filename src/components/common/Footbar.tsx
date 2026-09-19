import { useShallow } from 'zustand/react/shallow';
import { Coins, Dices, Play, RotateCcw, Shield, Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { PlayerVitals } from '../battle/PlayerVitals';
import { getPaidRerollCost } from '@/src/service/battle/rerollCost';
import { EQUIPMENT_ACTIONS } from '@/src/configs/equipment/equipmentActionConfig';
import { TeacherControls } from '../battle/TeacherControls';
import { ExposureBadge } from '../battle/BattleStatusBadges';
import { buildAttackPlan } from '@/src/service/battle/attackPlan';

interface FootbarProps {
  onResolve: () => void;
  isResolving: boolean;
  onOpenDiceBag: () => void;
  isConfiguring: boolean;
  isCombat: boolean;
}

export function Footbar({ onOpenDiceBag, onResolve, isResolving, isConfiguring, isCombat }: FootbarProps) {
  const { gold, dicePool, setDiceAction, control, maxControl, diceAction, creatureBattleState, equipments, comboSummary, combatPhase, activeRerollingIndex, pendingPaidRerollDiceId, currentEnemy, hoveredEquipmentId, unlockedDiceNotification, confirmBattlePreparation, stickerFlow } = useGameStore(useShallow((state) => ({
    gold: state.gold,
    dicePool: state.dicePool,
    setDiceAction: state.setDiceAction,
    control: state.control,
    maxControl: state.maxControl,
    diceAction: state.diceAction,
    creatureBattleState: state.creatureBattleState,
    equipments: state.equipments,
    comboSummary: state.comboSummary,
    combatPhase: state.combatPhase,
    activeRerollingIndex: state.activeRerollingIndex,
    pendingPaidRerollDiceId: state.pendingPaidRerollDiceId,
    currentEnemy: state.currentEnemy,
    hoveredEquipmentId: state.hoveredEquipmentId,
    unlockedDiceNotification: state.unlockedDiceNotification,
    confirmBattlePreparation: state.confirmBattlePreparation,
    stickerFlow: state.stickerFlow,
  })));

  const selectingAction = diceAction !== 'reroll';
  const paidCost = getPaidRerollCost(creatureBattleState.paidRerolls, equipments);
  const action = Object.values(EQUIPMENT_ACTIONS).find((item) => item.action === diceAction);
  const isControlPhase = combatPhase === 'CONTROL_PHASE';
  const totalForecastDamage = comboSummary?.totalDamage || 0;
  const canResolve = isControlPhase && activeRerollingIndex === null && !isResolving && !selectingAction && !pendingPaidRerollDiceId;
  const beforeExposure = isControlPhase && activeRerollingIndex === null && currentEnemy?.exposure && comboSummary ? buildAttackPlan(comboSummary, { ...currentEnemy, exposure: undefined }, equipments).reduce((sum, attack) => sum + attack.value, 0) : undefined;
  const highlightShield = isControlPhase && equipments.some((equipment) => equipment.id === hoveredEquipmentId && equipment.ruleId === 'BARRICADE');
  const totalForecastShield = comboSummary?.totalShield || 0;
  let resolveLabel = 'ATTACK';
  if (isResolving) resolveLabel = '結算連續撞擊中...';
  else if (activeRerollingIndex !== null) resolveLabel = '等待重骰落定...';
  else if (selectingAction) resolveLabel = '請選擇目標或取消';

  return <footer className="footbar">
    <div className="footbar-content">

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
            <span>點擊骰子重骰</span>
          ) : (
            <span className="paid-reroll-price">重骰：{paidCost}<Coins size={14} aria-label="金幣" />{gold < paidCost && '（金幣不足）'}</span>
          )}
        </div>

        <PlayerVitals />
        <div className="footbar-tools">
          <button type="button" id="btn-dice-bag" onClick={onOpenDiceBag}>
            <Dices size={20} /><span>{dicePool.length}</span>
          </button>
        </div>
      </div>

      {isCombat && <>
        {combatPhase === 'PREPARATION' ?
          <button type={isConfiguring ? "submit" : "button"}
            form={isConfiguring ? "battle-preparation" : undefined}
            className="btn-resolve" disabled={!!unlockedDiceNotification || !!stickerFlow}
            onClick={isConfiguring ? undefined : () => confirmBattlePreparation([])}
          >
            <Play size={20} />
            擲骰
          </button>
          :
          <div className="controls-right">
            {/* Forecast Badges */}
            <div className="forecast-group">

              <div className="forecast-dmg">
                <span className="dmg-number">
                  <Swords style={{ width: '22px', height: '22px', marginRight: '2px' }} />
                  {totalForecastDamage}
                </span>
                {isControlPhase && !!currentEnemy?.exposure && <ExposureBadge multiplier={currentEnemy.exposure} before={beforeExposure} after={totalForecastDamage} />}
              </div>

              <div className={`forecast-shield ${highlightShield ? 'is-highlighted' : ''}`} style={{ visibility: totalForecastShield > 0 ? 'visible' : 'hidden' }}>
                <Shield style={{ width: '18px', height: '18px', marginRight: '2px' }} />
                {totalForecastShield}
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
          </div>}

        <TeacherControls />
      </>}

    </div>
  </footer >;
}
