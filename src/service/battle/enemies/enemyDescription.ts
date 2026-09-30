import type { Enemy } from '../../../types/enemy';
import type { BattleComboSummary } from '../../../types/battle';
import type { CreatureBattleState } from '../../../types/creatures';
import type { Equipment } from '../../../types/game';
import { resolveEnemyRound } from './enemyRound';
import { currentIntent } from './enemyIntent';
export function describeEnemyIntentDetails(enemy: Enemy, manualRerolls = 0) {
  const intent = currentIntent(enemy), rules: string[] = [];
  const value = 'value' in intent ? intent.value : 0;
  rules.push(intent.type === 'rest' ? '休息' : intent.type === 'charge' ? intent.command ? '發出號令' : '蓄力'
    : intent.type === 'defend' ? `獲得 ${value} 護盾` : `攻擊 ${value + (enemy.strength ?? 0)} × ${intent.hits ?? 1}`);
  if (intent.type === 'charge' && !intent.command) {
    const next = enemy.intents[(enemy.currentIntentIndex + 1) % enemy.intents.length];
    if ('value' in next) rules.push(`下回合 ${next.value} 傷害`);
  }
  const counter = intent.counter, counters: string[] = [];
  if (counter) counters.push(`${counter.type === 'damage_taken' ? `本輪受傷達 ${counter.threshold}` : '自身護盾耗盡'}則${counter.effect === 'cancel' ? '取消行動' : '傷害減半'}`);
  if (intent.hitWeaken) counters.push(`本輪受到 ${intent.hitWeaken} 次命中則傷害減半`);
  if (intent.shieldWeaken) counters.push(`玩家本輪新生護盾達 ${intent.shieldWeaken} 則少攻擊一次`);
  if (intent.shieldMultiplier) rules.push(`持盾時傷害 ×${intent.shieldMultiplier}`);
  if (intent.mitigation) rules.push(`本輪受到傷害 ×${intent.mitigation}`);
  if (intent.shieldGain) rules.push(`出手後獲得 ${intent.shieldGain} 護盾`);
  if (intent.exposeOnBlock) counters.push(`整輪招式完全被盾擋住，下一輪受到傷害 ×${intent.exposeOnBlock}`);
  if (intent.seal) rules.push('封鎖下輪一骰的額外重骰與翻面');
  if (intent.grapple) {
    rules.push(`命中造成鉤索，後續拉扯 ${intent.grapple.damage} 傷害（護盾可擋）`);
    counters.push(`完整格擋招式可避免鉤索；已有鉤索可額外重骰被鉤骰，或本輪對來源造成 ${intent.grapple.breakDamage} 傷害解除`);
  }
  if (intent.command) rules.push(`其他同伴下一回合傷害 +${intent.command}`);
  if (enemy.armor) {
    rules.push(`次數甲 ${enemy.armor} 層，受傷 ×${enemy.traits!.hitArmor!.multiplier}`);
    counters.push('打光次數甲可使本次行動暈眩跳過');
  }
  if (enemy.armorStun) rules.push('已破甲，本次行動跳過');
  if (enemy.traits?.watch) rules.push('每回合初擲盯防朝上基礎值最高的骰子，該骰普通攻擊減半；玩家主動重骰哪顆就改盯哪顆，重骰被盯骰則繼續盯防；自動連鎖維持原目標，技能、追加及再攻擊照常');
  if (enemy.traits?.rerollFury) {
    const rule = enemy.traits.rerollFury, count = (enemy.fury ?? 0) + manualRerolls;
    const damage = 'value' in rule.intent ? rule.intent.value : 0;
    rules.push(enemy.furyPending ? '本輪猛攻後怒氣歸零'
      : `手動重骰累積 ${count}／${rule.threshold}；${count >= rule.threshold ? '已達標，下輪' : '達標則下輪'}${rule.intent.name}（${damage} 傷害）`);
  }
  if (enemy.traits?.contraband) rules.push(enemy.prizeLost ? '額外稀有貼紙已帶走'
    : `額外稀有貼紙：再 ${enemy.traits.contraband.deadline - (enemy.actionsTaken ?? 0)} 次敵方行動後帶走`);
  return { description: `${intent.name}：${rules.join('；')}。`, counter: counters.join('；') };
}
export function describeEnemyIntent(enemy: Enemy, manualRerolls = 0): string {
  const details = describeEnemyIntentDetails(enemy, manualRerolls);
  return details.description + (details.counter ? `破解：${details.counter}。` : '');
}
export function previewEnemyRound(enemies: Enemy[], enemyId: string, selectedId: string | null, summary: BattleComboSummary,
  equipment: Equipment[], hp: number, maxHp: number, shield: number, round: CreatureBattleState): string {
  const result = resolveEnemyRound(enemies, summary, equipment,
    { hp: Math.min(maxHp, hp + summary.healing), shield: shield + summary.totalShield }, round, selectedId);
  const enemy = result.enemies.find(item => item.id === enemyId)!;
  const resolution = result.resolutions[enemyId];
  const status = enemy.hp <= 0 ? '可擊殺' : resolution?.cancelled ? '可打斷' : resolution?.counterTriggered ? '可削弱' : '將行動';
  const loss = Math.max(0, Math.min(maxHp, hp + summary.healing) - result.hp);
  return `${status}；整輪預計生命損失 ${loss}，剩餘護盾 ${result.shield}`;
}
