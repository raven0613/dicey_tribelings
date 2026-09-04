import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Swords, RotateCcw, Zap, Sparkles, Shield } from 'lucide-react';

interface BattleControlsProps {
  onResolve: () => void;
  isResolving: boolean;
}

export const BattleControls: React.FC<BattleControlsProps> = ({ onResolve, isResolving }) => {
  const { combatPhase, control, maxControl, comboSummary } = useGameStore();

  const isControlPhase = combatPhase === 'CONTROL_PHASE';
  const totalForecastDamage = comboSummary?.totalDamage || 0;
  const totalForecastShield = comboSummary?.totalShield || 0;

  return (
    <div className="battle-controls">
      {/* Left: Control Points meter & Tips */}
      <div className="controls-left">
        <div className="control-meter-group">
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
          {control > 0 ? (
            <span>可單顆骰子重骰，調整組合追 Pattern 裝備！</span>
          ) : (
            <span className="exhausted">本場 Control 已用盡，準備鎖定結算</span>
          )}
        </div>
      </div>

      {/* Right: Damage Forecast & Main Resolve Button */}
      <div className="controls-right">
        {/* Forecast Badges */}
        <div className="forecast-group">
          <div className="forecast-dmg">
            <span>預估輸出:</span>
            <span className="dmg-number">
              <Swords style={{ width: '16px', height: '16px', marginRight: '2px' }} />
              {totalForecastDamage} 傷
            </span>
          </div>
          {totalForecastShield > 0 && (
            <div className="forecast-shield">
              <Shield style={{ width: '12px', height: '12px', marginRight: '2px' }} />
              +{totalForecastShield} 護盾
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          id="btn-resolve-battle"
          onClick={onResolve}
          disabled={!isControlPhase || isResolving}
          className={`btn-resolve ${isControlPhase && !isResolving ? 'ready' : 'disabled'}`}
        >
          <Swords style={{ width: '16px', height: '16px' }} />
          <span>{isResolving ? '結算連續撞擊中...' : '鎖定結果 • 結算攻擊'}</span>
        </button>
      </div>
    </div>
  );
};
