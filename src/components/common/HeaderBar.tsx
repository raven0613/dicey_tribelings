import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Heart, Shield, Coins, Sparkles, Volume2, VolumeX, Dices, RotateCcw } from 'lucide-react';

interface HeaderBarProps {
  onOpenDiceBag: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenDiceBag }) => {
  const {
    playerHp,
    maxHp,
    playerShield,
    gold,
    control,
    maxControl,
    soundMuted,
    toggleSound,
    mapNodes,
    currentNodeIndex,
    dicePool,
    combatPhase,
  } = useGameStore();

  const currentNode = mapNodes[currentNodeIndex];
  const hpPercent = Math.max(0, Math.min(100, (playerHp / maxHp) * 100));

  return (
    <header className="header-bar">
      {/* Left: Player Vital Stats */}
      <div className="stats-left">
        {/* HP Bar */}
        <div className="hp-stat-group">
          <div className="heart-icon-wrapper">
            <Heart className="heart-icon animate-pulse" />
            {playerShield > 0 && (
              <span className="shield-badge">
                <Shield style={{ width: '10px', height: '10px', marginRight: '2px', display: 'inline' }} />
                {playerShield}
              </span>
            )}
          </div>
          <div className="hp-info">
            <div className="hp-text">
              <span className="hp-label">HP</span>
              <span className="hp-numbers">
                {playerHp}/{maxHp}
              </span>
            </div>
            <div className="hp-bar-track">
              <div
                className="hp-bar-fill"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Gold */}
        <div className="gold-pill">
          <Coins style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
          <span>{gold} 金幣</span>
        </div>

        {/* Control Points */}
        <div className="control-pill">
          <RotateCcw style={{ width: '16px', height: '16px', color: '#818cf8' }} />
          <span>Control:</span>
          <span className="control-value">
            {control}/{maxControl}
          </span>
        </div>
      </div>

      {/* Center: Current Stage Node */}
      <div className="stage-badge">
        <Sparkles style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
        <span className="stage-text">
          第 {currentNodeIndex + 1}/{mapNodes.length} 格：{currentNode?.title || '冒險'}
        </span>
      </div>

      {/* Right: Quick Actions */}
      <div className="actions-right">
        <button
          id="btn-dice-bag"
          onClick={onOpenDiceBag}
          className="btn-dice-bag"
          title="檢視全部骰子與骰面"
        >
          <Dices style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
          <span>骰池 ({dicePool.length})</span>
        </button>

        <button
          id="btn-toggle-sound"
          onClick={toggleSound}
          className="btn-icon"
          title={soundMuted ? '開啟音效' : '靜音'}
        >
          {soundMuted ? (
            <VolumeX style={{ width: '16px', height: '16px', color: '#fb7185' }} />
          ) : (
            <Volume2 style={{ width: '16px', height: '16px', color: '#34d399' }} />
          )}
        </button>
      </div>
    </header>
  );
};
