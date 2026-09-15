import type { Enemy, EnemyIntent } from '../../../types/enemy';
import type { BattleComboSummary } from '../../../types/battle';
import type { CreatureBattleState } from '../../../types/creatures';
import type { Equipment } from '../../../types/game';
import { resolveEnemyRound } from './enemyRound';

function describeRules(intent: EnemyIntent): string[] {
  const rules: string[] = [];
  const counter = 'counter' in intent ? intent.counter : undefined;
  if (counter) {
    const condition = counter.type === 'damage_taken' ? `本回合受傷達 ${counter.threshold}` : '護盾耗盡';
    rules.push(`${condition}則${counter.effect === 'cancel' ? '取消' : '傷害減半'}`);
    if (counter.type === 'damage_taken' && counter.bonusReduction) rules.push(`每次追加命中，門檻降低 ${counter.bonusReduction}`);
  }
  if (intent.hits) rules.push(`連續攻擊 ${intent.hits} 次`);
  if (intent.guardedFollowup) rules.push(`完整擋住首擊，後手傷害 ×${intent.guardedFollowup}`);
  if (intent.unshieldedBonus) rules.push(`玩家無盾時 +${intent.unshieldedBonus} 傷害`);
  if (intent.shieldMultiplier) rules.push(`自身持盾時傷害 ×${intent.shieldMultiplier}`);
  if (intent.expose) rules.push(`出手後下一輪受到傷害 ×${intent.expose}`);
  if (intent.retaliate) rules.push(`本輪受到 ${intent.retaliate.hits} 次攻擊後反擊 ${intent.retaliate.damage}，每輪一次`);
  if (intent.heal) rules.push(`${intent.heal.consumeShield ? '消耗自身護盾等量' : ''}回血最多 ${intent.heal.amount}，每戰 ${intent.heal.uses} 次`);
  if (intent.strength) rules.push(`後續攻擊 +${intent.strength}`);
  if (intent.seal) rules.push('封鎖下輪一顆骰子的額外重骰與翻面');
  if (intent.grapple) rules.push(`鉤住一顆骰子，下輪額外重骰解除，否則受到 ${intent.grapple} 拉扯傷害`);
  if (intent.stunOnBreak) rules.push('本輪實際破盾則暈眩，跳過這次行動');
  if (intent.singleHitThreshold) rules.push(`單擊受傷達 ${intent.singleHitThreshold} 則傷害減半`);
  if (intent.diverseTags) rules.push(`玩家場上有 ${intent.diverseTags} 種土人標籤則傷害減半`);
  return rules;
}

function describeAction(intent: EnemyIntent, next: EnemyIntent): string {
  let effect = intent.type === 'rest' ? '本次休息' : intent.type === 'charge' ? '本次蓄力'
    : intent.type === 'defend' ? `獲得 ${intent.value} 護盾` : `每擊基礎傷害 ${intent.value}`;
  if (intent.type === 'charge') {
    effect += `，下回合造成 ${'value' in next ? next.value : 0} 傷害`;
  }
  return `${intent.name}：${[effect, ...describeRules(intent)].join('；')}`;
}

export function describeEnemyIntent(enemy: Enemy): string {
  const intent = enemy.intents[enemy.currentIntentIndex];
  const action = describeAction(intent, enemy.intents[(enemy.currentIntentIndex + 1) % enemy.intents.length]);
  const details: string[] = [];
  if (enemy.traits?.onHpHit) details.push(`每次命中生命後，攻擊 +${enemy.traits.onHpHit}`);
  if (enemy.traits?.missingHpPower) details.push(`每失去 ${enemy.traits.missingHpPower.fraction * 100}% 生命，攻擊 +${enemy.traits.missingHpPower.damage}`);
  if (enemy.traits?.comboVulnerability) details.push(`本輪每次命中使後續受傷 +${enemy.traits.comboVulnerability * 100}%`);
  if (enemy.armor) details.push(`剩餘 ${enemy.armor} 層次數甲，受到傷害 ×${enemy.traits!.hitArmor!.multiplier}`);
  if (intent.heal) details.push(`剩餘 ${Math.max(0, intent.heal.uses - (enemy.healsUsed?.[intent.name] ?? 0))} 次`);
  return `${[action, ...details].join('；')}。`;
}

export function previewEnemyRound(enemy: Enemy, summary: BattleComboSummary, equipment: Equipment[],
  hp: number, maxHp: number, shield: number, round: CreatureBattleState): string {
  const result = resolveEnemyRound(enemy, summary, equipment,
    { hp: Math.min(maxHp, hp + summary.healing), shield: shield + summary.totalShield }, round);
  const hpLoss = Math.max(0, Math.min(maxHp, hp + summary.healing) - result.hp);
  const status = result.hp <= 0 ? '將會倒下' : result.enemy.hp <= 0 ? '可擊殺'
    : result.resolution.cancelled ? '可打斷' : result.resolution.counterTriggered ? '可削弱' : '敵人將行動';
  const intent = enemy.intents[enemy.currentIntentIndex];
  const counter = 'counter' in intent ? intent.counter : undefined;
  let remaining = '';
  if (result.hp > 0 && result.enemy.hp > 0 && counter && !result.resolution.counterTriggered) {
    const value = counter.type === 'damage_taken' ? Math.max(0, counter.threshold
      - (result.actionEnemy.bonusHits ?? 0) * (counter.bonusReduction ?? 0) - (result.actionEnemy.roundDamage ?? 0))
      : result.actionEnemy.shield;
    remaining = `；尚差 ${value}`;
  }
  return `${status}${remaining}；預計生命損失 ${hpLoss}，剩餘護盾 ${result.shield}`;
}
