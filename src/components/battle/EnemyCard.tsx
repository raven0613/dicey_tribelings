import React from 'react';
import { Enemy } from '../../types/game';
import { Shield, Swords, Sparkles, Skull, Crown } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

interface EnemyCardProps {
  enemy: Enemy | null;
  isHit?: boolean;
}

export const EnemyCard: React.FC<EnemyCardProps> = ({ enemy, isHit = false }) => {
  const { damagePops, attackingStage } = useGameStore();
  if (!enemy) return null;

  const isImpacted = isHit || attackingStage === 'impact';
  const hpPercent = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
  const currentIntent = enemy.intents[enemy.currentIntentIndex] || enemy.intents[0];

  const cardClass = [
    'enemy-card',
    enemy.isBoss ? 'boss' : '',
    enemy.isElite ? 'elite' : '',
    isImpacted ? 'impacted animate-flinch' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const intentClass = [
    'intent-bubble',
    'animate-pulse',
    currentIntent?.type === 'heavy_attack'
      ? 'heavy-attack'
      : currentIntent?.type === 'attack'
      ? 'attack'
      : currentIntent?.type === 'defend'
      ? 'defend'
      : 'buff',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClass}>
      {/* Floating Damage Pops */}
      <div className="damage-pops-layer">
        {damagePops.map((pop) => (
          <div
            key={pop.id}
            className="damage-pop-item animate-float-damage"
            style={{
              left: `calc(50% + ${pop.xOffset || 0}px)`,
              color:
                pop.element === 'fire'
                  ? '#fb923c'
                  : pop.element === 'ice'
                  ? '#38bdf8'
                  : pop.element === 'thunder'
                  ? '#fde047'
                  : pop.element === 'wind'
                  ? '#4ade80'
                  : '#fb7185',
            }}
          >
            <span>-{pop.value}</span>
            {pop.label && <span className="pop-label">{pop.label}</span>}
          </div>
        ))}
      </div>

      {/* Enemy Header & Badges */}
      <div className="enemy-header">
        <div className="enemy-title-group">
          {enemy.isBoss && (
            <span className="enemy-badge boss-badge">
              <Crown style={{ width: '12px', height: '12px', color: '#fbbf24' }} /> BOSS
            </span>
          )}
          {enemy.isElite && (
            <span className="enemy-badge elite-badge">
              <Skull style={{ width: '12px', height: '12px', color: '#c084fc' }} /> 菁英
            </span>
          )}
          <h2 className="enemy-name">{enemy.name}</h2>
        </div>

        {/* Intent Bubble */}
        {enemy.hp <= 0 ? (
          <div
            className="intent-bubble defeat animate-pulse"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              borderColor: 'rgba(239, 68, 68, 0.5)',
              color: '#f87171',
            }}
          >
            <Skull style={{ width: '14px', height: '14px' }} />
            <span>已擊敗</span>
          </div>
        ) : currentIntent ? (
          <div className={intentClass} title={currentIntent.description}>
            {currentIntent.type === 'attack' && <Swords style={{ width: '14px', height: '14px' }} />}
            {currentIntent.type === 'heavy_attack' && (
              <Swords style={{ width: '14px', height: '14px', color: '#fb7185' }} />
            )}
            {currentIntent.type === 'defend' && <Shield style={{ width: '14px', height: '14px' }} />}
            {currentIntent.type === 'buff' && <Sparkles style={{ width: '14px', height: '14px' }} />}
            <span>{currentIntent.description}</span>
          </div>
        ) : null}
      </div>

      {/* Center Avatar & Health */}
      <div className="enemy-body">
        {/* Large Avatar Emoji with Glow */}
        <div className="enemy-avatar-box">
          <span className="avatar-emoji">{enemy.avatar}</span>
          {enemy.shield > 0 && (
            <div className="avatar-shield-badge">
              <Shield style={{ width: '12px', height: '12px', marginRight: '2px', display: 'inline' }} />
              {enemy.shield}
            </div>
          )}
        </div>

        {/* Health Bar Details */}
        <div className="enemy-hp-container">
          <div className="hp-row">
            <span className="hp-label">生命值</span>
            <span className="hp-val">
              <span className="hp-current">{enemy.hp}</span> / {enemy.maxHp} HP
            </span>
          </div>

          <div className="hp-track">
            {/* Shield Overlay Bar */}
            {enemy.shield > 0 && (
              <div
                className="shield-fill"
                style={{ width: `${Math.min(100, (enemy.shield / enemy.maxHp) * 100)}%` }}
              />
            )}
            {/* Main HP Bar */}
            <div
              className={`hp-fill ${enemy.isBoss ? 'boss-hp' : ''}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
