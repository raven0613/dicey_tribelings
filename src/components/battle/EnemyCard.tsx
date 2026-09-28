import type { Enemy } from '../../types/enemy';
import { currentIntent as getCurrentIntent } from '../../service/battle/enemies/enemyIntent';
import { DamagePopLayer } from './DamagePopLayer';
import { getGameRect } from '../../service/layout/gameViewport';
import { useShallow } from 'zustand/react/shallow';
import { ExposureBadge } from './BattleStatusBadges';
import { getRoundFace } from '../../service/battle/creatures/imposterResolution';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { BATTLE_PRESENTATION as timing } from '../../configs/battleConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { Shield, Swords, Sparkles, Skull, Crown, Crosshair } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { describeEnemyIntent, previewEnemyRound } from '../../service/battle/enemies/enemyDescription';
import { SkillText } from '../common/SkillText';
import { useSkillTooltip } from '../common/useSkillTooltip';

export const EnemyCard: React.FC = () => {
  const enemies = useGameStore(state => state.enemies);
  return <div className="enemy-formation">{enemies.map(enemy => <EnemyMember key={enemy.id} enemy={enemy} />)}</div>;
};
const EnemyMember: React.FC<{ enemy: Enemy }> = ({ enemy }) => {
  const { enemies, selectedEnemyId, activeEnemyId, selectEnemy, damagePops, attackingStage, combatPhase, comboSummary, activeRerollingIndex, enemyAttack, equipments, playerHp, maxHp, playerShield, creatureBattleState, dicePool, rolledIndices } = useGameStore(useShallow((state) => ({
    enemies: state.enemies, selectedEnemyId: state.selectedEnemyId, activeEnemyId: state.activeEnemyId, selectEnemy: state.selectEnemy,
    damagePops: state.damagePops,
    attackingStage: state.attackingStage,
    combatPhase: state.combatPhase,
    comboSummary: state.comboSummary,
    activeRerollingIndex: state.activeRerollingIndex,
    enemyAttack: state.enemyAttack,
    equipments: state.equipments,
    playerHp: state.playerHp,
    maxHp: state.maxHp,
    playerShield: state.playerShield,
    creatureBattleState: state.creatureBattleState,
    dicePool: state.dicePool,
    rolledIndices: state.rolledIndices,
  })));
  const enemyRef = useRef<HTMLDivElement>(null);
  const [attackDistance, setAttackDistance] = useState(0);
  const intentDescription = describeEnemyIntent(enemy, combatPhase === 'CONTROL_PHASE' ? creatureBattleState.manualRerolls : 0);
  const intentPreview = combatPhase === 'CONTROL_PHASE' && activeRerollingIndex === null && comboSummary
    ? previewEnemyRound(enemies, enemy.id, selectedEnemyId, comboSummary, equipments, playerHp, maxHp, playerShield, creatureBattleState) : '';
  const { tooltip, tooltipProps } = useSkillTooltip([intentDescription, intentPreview].filter(Boolean).join('・'));
  useLayoutEffect(() => {
    if (activeEnemyId !== enemy.id || enemyAttack?.stage !== 'windup') return;
    const origin = getGameRect(enemyRef.current!);
    const target = getGameRect(document.getElementById('battle-player-target')!);
    setAttackDistance(Math.max(0, target.top - origin.bottom) + (enemyAttack.heavy ? 8 : 4));
  }, [enemyAttack?.stage]);

  const targetName = (id: string) => {
    const index = dicePool.findIndex((die) => die.id === id);
    return index >= 0 ? CREATURE_CONFIG[getRoundFace(dicePool[index], rolledIndices[index], creatureBattleState).creature].name : '';
  };
  const isImpacted = activeEnemyId === enemy.id && attackingStage === 'impact';
  const isSelected = selectedEnemyId === enemy.id;
  const isActive = activeEnemyId === enemy.id;
  const canSelect = enemy.hp > 0 && ['PREPARATION', 'ROLLING', 'CONTROL_PHASE'].includes(combatPhase);
  const hpPercent = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
  const currentIntent = getCurrentIntent(enemy);

  const cardClass = [
    'enemy-card enemy-strike',
    enemy.isBoss ? 'boss' : '',
    enemy.isElite ? 'elite' : '',
    isImpacted ? 'impacted animate-flinch' : '',
    isActive && enemyAttack ? 'is-attacking-player' : '',
    isActive && enemyAttack?.heavy ? 'is-heavy' : '',
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

  return (<>
    <div ref={enemyRef} id={(activeEnemyId ? isActive : isSelected) ? 'battle-enemy-target' : undefined} className={cardClass}
      data-stage={isActive ? enemyAttack?.stage ?? 'idle' : 'idle'} data-selected={isSelected} style={{
        '--strike-y': `${attackDistance}px`,
        '--windup-duration': `${timing.enemyWindupMs}ms`, '--dash-duration': `${timing.enemyDashMs}ms`,
        '--impact-duration': `${timing.enemyImpactMs}ms`, '--recoil-duration': `${timing.enemyRecoilMs}ms`,
      } as React.CSSProperties}>
      <div className="enemy-card-content">
        {/* Enemy Header & Badges */}
        <div className="enemy-header">
          <div className="enemy-title-group">
            {enemy.isBoss && (
              <span className="enemy-badge boss-badge">
                <Crown className="ui-icon" style={{ color: '#fbbf24' }} /> BOSS
              </span>
            )}
            {enemy.isElite && (
              <span className="enemy-badge elite-badge">
                <Skull className="ui-icon" style={{ color: '#c084fc' }} /> 菁英
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
              <Skull className="ui-icon" />
              <span>已擊敗</span>
            </div>
          ) : currentIntent ? (
            <div className={intentClass} {...tooltipProps} tabIndex={0}>
              {tooltip}
              {currentIntent.type === 'attack' && <Swords className="ui-icon" />}
              {currentIntent.type === 'heavy_attack' && (
                <Swords className="ui-icon" style={{ color: '#fb7185' }} />
              )}
              {currentIntent.type === 'defend' && <Shield className="ui-icon" />}
              {(currentIntent.type === 'charge' || currentIntent.type === 'rest') && (
                <Sparkles className="ui-icon" />
              )}
              <span><SkillText text={`${intentDescription}${intentPreview ? `（${intentPreview}）` : ''}`} /></span>
            </div>
          ) : null}
        </div>

        <div className="enemy-status text-xs leading-relaxed">
          {enemy.traits?.watch && creatureBattleState.watchedDieId && <span>盯防：{targetName(creatureBattleState.watchedDieId)}（普通攻擊減半）；</span>}
          {!!enemy.armor && <span>次數甲 {enemy.armor} 層；</span>}
          {!!enemy.strength && <span>攻擊 +{enemy.strength}；</span>}
          {!!enemy.exposure && <ExposureBadge multiplier={enemy.exposure} />}
          {enemy.sealedDie && <span>本輪封鎖：{targetName(enemy.sealedDie)}；</span>}
          {enemy.grapple && ['CONTROL_PHASE', 'RESOLVING_CALCULATION', 'RESOLVING_ATTACK'].includes(combatPhase) && <span>鉤索：{targetName(enemy.grapple.diceId)}，
            {creatureBattleState.rerolledDice?.includes(enemy.grapple.diceId) ? '已解除' : `額外重骰或對來源造成 ${enemy.grapple.breakDamage} 傷害解除，否則拉扯 ${enemy.grapple.damage}（護盾可擋）`}；</span>}
        </div>
        {/* Center Avatar & Health */}
        <div className="enemy-body">
          {/* Large Avatar Emoji with Glow */}
          <button type="button" className="enemy-avatar-box" onClick={() => selectEnemy(enemy.id)} disabled={!canSelect} aria-pressed={isSelected} aria-label={`選擇目標：${enemy.name}`}>
            {isSelected && <Crosshair className="enemy-target-icon" aria-label="本回合目標" />}
            <span className="avatar-emoji">{enemy.avatar}</span>
            {enemy.shield > 0 && (
              <div className="avatar-shield-badge">
                <Shield className="ui-icon" style={{ marginRight: '2px', display: 'inline' }} />
                {enemy.shield}
              </div>
            )}
          </button>

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
    <DamagePopLayer anchorRef={enemyRef} pops={damagePops.filter(pop => pop.enemyId === enemy.id)} />
    </>
  );
};
