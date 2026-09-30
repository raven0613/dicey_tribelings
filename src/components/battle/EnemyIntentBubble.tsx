import { Shield, Swords, Sparkles, Skull } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import type { Enemy } from '../../types/enemy';
import { useGameStore } from '../../store/gameStore';
import { currentIntent, resolveEnemyIntent } from '../../service/battle/enemies/enemyIntent';
import { describeEnemyIntentDetails, previewEnemyRound } from '../../service/battle/enemies/enemyDescription';
import { getRoundFace } from '../../service/battle/creatures/imposterResolution';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { useSkillTooltip } from '../common/useSkillTooltip';
import { useGameViewport } from '../layout/GameViewportContext';
import { SkillText } from '../common/SkillText';
import { ExposureBadge } from './BattleStatusBadges';

export function EnemyIntentBubble({ enemy }: { enemy: Enemy }) {
  const state = useGameStore(useShallow(state => ({
    enemies: state.enemies, selectedEnemyId: state.selectedEnemyId, combatPhase: state.combatPhase,
    comboSummary: state.comboSummary, activeRerollingIndex: state.activeRerollingIndex,
    equipments: state.equipments, playerHp: state.playerHp, maxHp: state.maxHp, playerShield: state.playerShield,
    creatureBattleState: state.creatureBattleState, dicePool: state.dicePool, rolledIndices: state.rolledIndices,
  })));
  const { mobile } = useGameViewport();
  const control = state.combatPhase === 'CONTROL_PHASE';
  const details = describeEnemyIntentDetails(enemy, control ? state.creatureBattleState.manualRerolls : 0);
  const preview = control && state.activeRerollingIndex === null && state.comboSummary
    ? previewEnemyRound(state.enemies, enemy.id, state.selectedEnemyId, state.comboSummary, state.equipments,
      state.playerHp, state.maxHp, state.playerShield, state.creatureBattleState) : '';
  const targetName = (id: string) => {
    const index = state.dicePool.findIndex(die => die.id === id);
    return index >= 0 ? CREATURE_CONFIG[getRoundFace(state.dicePool[index], state.rolledIndices[index], state.creatureBattleState).creature].name : '';
  };
  const grapple = enemy.grapple;
  const content = <div className="enemy-intent-details">
    <strong>技能效果</strong><p><SkillText text={details.description} /></p>
    <strong>如何破解</strong><p><SkillText text={details.counter || '此招沒有專屬打斷或削弱條件。'} /></p>
    <div className="enemy-status">
      {enemy.traits?.watch && state.creatureBattleState.watchedDieId && <p>盯防：{targetName(state.creatureBattleState.watchedDieId)}（普通攻擊減半）</p>}
      {!!enemy.armor && <p>次數甲 {enemy.armor} 層</p>}
      {!!enemy.strength && <p>攻擊 +{enemy.strength}</p>}
      {!!enemy.exposure && <ExposureBadge multiplier={enemy.exposure} />}
      {enemy.sealedDie && <p>本輪封鎖：{targetName(enemy.sealedDie)}</p>}
      {grapple && ['CONTROL_PHASE', 'RESOLVING_CALCULATION', 'RESOLVING_ATTACK'].includes(state.combatPhase) && <p>鉤索：{targetName(grapple.diceId)}，
        {state.creatureBattleState.rerolledDice?.includes(grapple.diceId) ? '已解除'
          : `額外重骰或對來源造成 ${grapple.breakDamage} 傷害解除，否則拉扯 ${grapple.damage}（護盾可擋）`}</p>}
    </div>
    {preview && <><strong>本輪預估</strong><p><SkillText text={preview} /></p></>}
  </div>;
  const { tooltip, tooltipProps, show } = useSkillTooltip(content, { interactive: true, label: `${enemy.name}技能說明` });
  const intent = currentIntent(enemy), result = resolveEnemyIntent(enemy);
  const attacking = intent.type === 'attack' || intent.type === 'heavy_attack';
  const Icon = attacking ? Swords : intent.type === 'defend' ? Shield : Sparkles;
  const suffix = result.cancelled ? '：已打斷' : attacking ? `：${result.damage} × ${result.hits} hit`
    : intent.type === 'defend' ? `：${result.shieldGain} 護盾` : '';

  return <div className="enemy-intent-position">
    {enemy.hp <= 0 ?
      <div className="enemy-intent-bubble is-defeated"><Skull className="ui-icon" />已擊敗</div>
      : <button type="button" className="enemy-intent-bubble" {...tooltipProps}
        aria-label={`${intent.name}，查看技能與破解方式`} onClick={event => { if (mobile) show(event); }}>
        <Icon className="ui-icon" /><span>{intent.name}{suffix}</span>
      </button>}
    {enemy.hp > 0 && tooltip}
  </div>;
}
