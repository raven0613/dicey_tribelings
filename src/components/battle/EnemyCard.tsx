import { ExposureBadge } from './BattleStatusBadges';
import { getRoundFace } from '../../service/battle/creatures/imposterResolution';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { BATTLE_PRESENTATION as timing } from '../../configs/battleConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { Enemy } from '../../types/game';
import { Shield, Swords, Sparkles, Skull, Crown } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { describeEnemyIntent, previewEnemyRound } from '../../service/battle/enemies/enemyDescription';
import { SkillText } from '../common/SkillText';
import { useSkillTooltip } from '../common/useSkillTooltip';

interface EnemyCardProps {
  enemy: Enemy | null;
  isHit?: boolean;
}

export const EnemyCard: React.FC<EnemyCardProps> = ({ enemy, isHit = false }) => {
  const { damagePops, attackingStage, combatPhase, comboSummary, activeRerollingIndex, enemyAttack, equipments, playerHp, maxHp, playerShield, creatureBattleState, dicePool, rolledIndices } = useGameStore();
  const enemyRef = useRef<HTMLDivElement>(null);
  const [attackDistance, setAttackDistance] = useState(0);
  const intentDescription = enemy ? describeEnemyIntent(enemy) : '';
  const intentPreview = enemy && combatPhase === 'CONTROL_PHASE' && activeRerollingIndex === null && comboSummary
    ? previewEnemyRound(enemy, comboSummary, equipments, playerHp, maxHp, playerShield, creatureBattleState) : '';
  const { tooltip, tooltipProps } = useSkillTooltip([intentDescription, intentPreview].filter(Boolean).join('・'));
  useLayoutEffect(() => {
    if (enemyAttack?.stage !== 'windup') return;
    const origin = enemyRef.current!.getBoundingClientRect();
    const target = document.getElementById('battle-player-target')!.getBoundingClientRect();
    setAttackDistance(Math.max(0, target.top - origin.bottom) + (enemyAttack.heavy ? 8 : 4));
  }, [enemyAttack?.stage]);
  if (!enemy) return null;

  const targetName = (id: string) => {
    const index = dicePool.findIndex((die) => die.id === id);
    return index >= 0 ? CREATURE_CONFIG[getRoundFace(dicePool[index], rolledIndices[index], creatureBattleState).creature].name : '';
  };
  const isImpacted = isHit || attackingStage === 'impact';
  const hpPercent = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
  const currentIntent = enemy.intents[enemy.currentIntentIndex] || enemy.intents[0];

  const cardClass = [
    'enemy-card enemy-strike',
    enemy.isBoss ? 'boss' : '',
    enemy.isElite ? 'elite' : '',
    isImpacted ? 'impacted animate-flinch' : '',
    enemyAttack ? 'is-attacking-player' : '',
    enemyAttack?.heavy ? 'is-heavy' : '',
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
    <div ref={enemyRef} id="battle-enemy-target" className={cardClass}
      data-stage={enemyAttack?.stage ?? 'idle'} style={{
        '--strike-y': `${attackDistance}px`,
        '--windup-duration': `${timing.enemyWindupMs}ms`, '--dash-duration': `${timing.enemyDashMs}ms`,
        '--impact-duration': `${timing.enemyImpactMs}ms`, '--recoil-duration': `${timing.enemyRecoilMs}ms`,
      } as React.CSSProperties}>
      {/* Floating Damage Pops */}
      <div className="damage-pops-layer">
        {damagePops.map((pop) => (
          <div
            key={pop.id}
            className="damage-pop-item animate-float-damage"
            style={{
              left: `calc(50% + ${pop.xOffset || 0}px)`,
              color: pop.creature ? CREATURE_CONFIG[pop.creature].color : '#e9d5ff',
            }}
          >
            <span>-{pop.value}</span>
            {pop.label && <span className="pop-label">{pop.label}</span>}
          </div>
        ))}
      </div>

      <div className="enemy-card-content">
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
            <div className={intentClass} {...tooltipProps} tabIndex={0}>
              {tooltip}
              {currentIntent.type === 'attack' && <Swords style={{ width: '14px', height: '14px' }} />}
              {currentIntent.type === 'heavy_attack' && (
                <Swords style={{ width: '14px', height: '14px', color: '#fb7185' }} />
              )}
              {currentIntent.type === 'defend' && <Shield style={{ width: '14px', height: '14px' }} />}
              {(currentIntent.type === 'charge' || currentIntent.type === 'rest') && (
                <Sparkles style={{ width: '14px', height: '14px' }} />
              )}
              <span><SkillText text={`${intentDescription}${intentPreview ? `（${intentPreview}）` : ''}`} /></span>
            </div>
          ) : null}
        </div>

        <div className="enemy-status text-xs leading-relaxed">
          {!!enemy.armor && <span>次數甲 {enemy.armor} 層；</span>}
          {!!enemy.strength && <span>攻擊 +{enemy.strength}；</span>}
          {!!enemy.exposure && <ExposureBadge multiplier={enemy.exposure} />}
          {enemy.sealedDie && <span>本輪封鎖：{targetName(enemy.sealedDie)}；</span>}
          {enemy.grapple && <span>鉤索：{targetName(enemy.grapple.diceId)}，
            {creatureBattleState.rerolledDice?.includes(enemy.grapple.diceId) ? '已解除' : `額外重骰解除，否則受到 ${enemy.grapple.damage} 傷害`}；</span>}
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
    </div>
  );
};
