import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_CONFIG } from '../../../configs/monsters/monsterConfig';
import { createEnemy } from './enemyFactory';
import { resolvePlayerHit, finishEnemyRound } from './enemyMechanics';
import { resolveEnemyIntent } from './enemyIntent';
import { INITIAL_DICE_POOL, INITIAL_PLAYER_STATS } from '../../../configs/gameConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../../configs/equipment/equipmentConfig';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState } from '../creatures/creatureState';
import { performStartBattleRoll, performControlReroll, performDiceAction } from '../rollService';
import { resolveRerollChain } from '../creatures/rerollResolution';
import { resolveEnemyRound } from './enemyRound';
import type { Enemy, EnemyIntent } from '../../../types/enemy';

const withRule = (rule: string) => createEnemy(MONSTER_CONFIG.find((enemy) => rule in (enemy.traits ?? {}))!.id);

test('次數甲逐段消耗；破甲後同值攻擊傷害提高', () => {
  let enemy = withRule('hitArmor');
  const value = enemy.traits!.hitArmor!.layers;
  const first = resolvePlayerHit(enemy, value, false);
  enemy = first.enemy;
  for (let hit = 1; hit < enemy.traits!.hitArmor!.layers; hit++) enemy = resolvePlayerHit(enemy, value, true).enemy;
  const after = resolvePlayerHit(enemy, value, true);
  assert.ok(after.value > first.value);
  assert.equal(after.enemy.armor, 0);
});

test('狂戰士只有實際命中生命才成長，下輪保留', () => {
  const enemy = withRule('onHpHit');
  const blocked = finishEnemyRound(enemy, resolveEnemyIntent(enemy, 0), 0);
  const hit = finishEnemyRound(enemy, resolveEnemyIntent(enemy, 0), 1);
  assert.equal(blocked.strength, 0);
  assert.equal(hit.strength, enemy.traits!.onHpHit);
  const summary = attacks([]);
  const wounded = resolveEnemyRound(enemy, summary, [], player, createCreatureBattleState());
  const guarded = resolveEnemyRound(enemy, summary, [], { ...player, shield: enemy.maxHp }, createCreatureBattleState());
  assert.equal(wounded.enemy.strength, enemy.traits!.onHpHit);
  assert.equal(guarded.enemy.strength, 0);
});

test('典獄長以損失生命比例提高攻擊', () => {
  const enemy = withRule('missingHpPower');
  const healthy = resolveEnemyIntent(enemy, 0);
  const wounded = resolveEnemyIntent({ ...enemy, hp: enemy.maxHp / 2 }, 0);
  assert.ok(wounded.damage > healthy.damage);
});


function withIntent(predicate: (intent: EnemyIntent) => boolean): Enemy {
  const definition = MONSTER_CONFIG.find((enemy) => enemy.intents.some(predicate))!;
  const enemy = createEnemy(definition.id);
  enemy.currentIntentIndex = enemy.intents.findIndex(predicate);
  return enemy;
}
function attacks(values: number[]) {
  const summary = calculateRollResolution(INITIAL_DICE_POOL, INITIAL_DICE_POOL.map(() => 0), []);
  summary.items = summary.items.map((item) => ({ ...item, finalDamage: 0 }));
  summary.bonusDice = values.map((bonusDamage, index) => ({ id: `hit-${index}`, source: { kind: 'equipment' as const, equipmentId: 'fixture' },
    sourceName: 'fixture', label: '', description: '', bonusDamage }));
  summary.repeatAttacks = []; summary.totalShield = 0; summary.reflection = 0;
  return summary;
}
const player = { hp: INITIAL_PLAYER_STATS.maxHp, shield: 0 };

test('反擊每輪一次，致命一擊不反擊，玩家倒下立刻停止其餘攻擊', () => {
  const enemy = withIntent((intent) => !!intent.retaliate);
  const counter = enemy.intents[enemy.currentIntentIndex].retaliate!;
  const summary = attacks(Array(counter.bonusHits + 1).fill(1));
  const result = resolveEnemyRound(enemy, summary, [], player, createCreatureBattleState());
  assert.equal(result.events.filter((event) => event.kind === 'enemy').length, 2);
  const deadPlayer = resolveEnemyRound(enemy, summary, [], { hp: counter.damage, shield: 0 }, createCreatureBattleState());
  assert.equal(deadPlayer.events.filter((event) => event.kind === 'player').length, counter.bonusHits);
  const lethal = resolveEnemyRound({ ...enemy, hp: 1, shield: 0, bonusHits: counter.bonusHits - 1 }, attacks([1]), [], player, createCreatureBattleState());
  assert.ok(lethal.events.every((event) => event.kind === 'player'));
  let ordinary = enemy;
  for (let hit = 0; hit <= counter.bonusHits; hit++) {
    const normal = resolvePlayerHit(ordinary, 1, false);
    assert.equal(normal.retaliation, 0);
    ordinary = normal.enemy;
  }
});

test('藥劑在回合交界按血量預告，使用完畢後繼續攻擊', () => {
  const enemy = createEnemy(MONSTER_CONFIG.find((entry) => entry.intents.some((intent) => intent.heal?.belowHp))!.id);
  assert.equal(enemy.intents[0].type, 'attack');
  const potion = enemy.intents.find((intent) => intent.heal?.belowHp)!;
  const healthy = finishEnemyRound(enemy, resolveEnemyIntent(enemy), 0);
  assert.equal(healthy.intents[healthy.currentIntentIndex].type, 'attack');
  const wounded = { ...enemy, hp: enemy.maxHp * potion.heal!.belowHp! };
  const next = finishEnemyRound(wounded, resolveEnemyIntent(wounded), 0);
  assert.equal(next.intents[next.currentIntentIndex].name, potion.name);
  const spent = finishEnemyRound({ ...wounded, healsUsed: { [potion.name]: potion.heal!.uses } }, resolveEnemyIntent(wounded), 0);
  assert.equal(spent.intents[spent.currentIntentIndex].type, 'attack');
});

test('資深吞盾怪物在受傷後架盾，下一輪可破盾阻止恢復', () => {
  const definition = MONSTER_CONFIG.find((entry) => entry.intents[0].type === 'defend'
    && entry.intents[1].heal?.consumeShield)!;
  const enemy = createEnemy(definition.id);
  const first = resolveEnemyRound(enemy, attacks([enemy.maxHp / 2]), [], player, createCreatureBattleState());
  assert.ok(first.enemy.hp < first.enemy.maxHp && first.enemy.shield > 0);
  assert.ok(first.enemy.intents[first.enemy.currentIntentIndex].heal?.consumeShield);
  const healed = resolveEnemyRound(first.enemy, attacks([]), [], player, createCreatureBattleState());
  assert.ok(healed.enemy.hp > first.enemy.hp);
  const broken = resolveEnemyRound(first.enemy, attacks([first.enemy.shield]), [], player, createCreatureBattleState());
  assert.equal(broken.resolution.healing, 0);
});

test('吞盾只消耗真正恢復的量，受缺血、上限及使用次數限制', () => {
  const enemy = withIntent((intent) => !!intent.heal?.consumeShield);
  const intent = enemy.intents[enemy.currentIntentIndex];
  const wounded = { ...enemy, hp: enemy.maxHp - intent.heal!.amount / 2 };
  const result = resolveEnemyRound(wounded, attacks([]), [], player, createCreatureBattleState());
  const gain = result.enemy.hp - wounded.hp;
  assert.equal(gain, Math.min(intent.heal!.amount / 2, wounded.shield));
  assert.equal(wounded.shield - result.enemy.shield, gain);
  const exhausted = { ...wounded, healsUsed: { [intent.name]: intent.heal!.uses } };
  assert.equal(resolveEnemyIntent(exhausted).healing, 0);
});

test('完整格擋首擊削弱後手，每段獨立消耗盾', () => {
  const enemy = withIntent((intent) => !!intent.guardedFollowup);
  const intent = enemy.intents[enemy.currentIntentIndex];
  assert.ok('value' in intent);
  const result = resolveEnemyRound(enemy, attacks([]), [], { ...player, shield: intent.value }, createCreatureBattleState());
  const events = result.events.filter((event) => event.kind === 'enemy');
  assert.equal(events.length, intent.hits);
  assert.equal(events[0].hp, player.hp);
  assert.ok(events.slice(1).every((event) => event.damage === Math.ceil(intent.value * intent.guardedFollowup!)));
});

test('無盾加傷與持盾倍率都依當下護盾判斷', () => {
  const enemy = withIntent((intent) => !!intent.unshieldedBonus);
  const intent = enemy.intents[enemy.currentIntentIndex];
  assert.equal(resolveEnemyIntent(enemy, 0, 0).damage - resolveEnemyIntent(enemy, 0, 1).damage, intent.unshieldedBonus);
  const armored = withIntent((intent) => !!intent.shieldMultiplier);
  const attack = armored.intents[armored.currentIntentIndex];
  assert.equal(resolveEnemyIntent(armored).damage, resolveEnemyIntent({ ...armored, shield: 0 }).damage * attack.shieldMultiplier!);
});

test('封骰保留初擲，主動／老師／連鎖／翻面都不能改封鎖骰，下輪解除', () => {
  const enemy = withIntent((intent) => !!intent.seal);
  const result = resolveEnemyRound(enemy, attacks([]), [], player, createCreatureBattleState());
  assert.ok(result.enemy.sealedDie);
  const rolled = performStartBattleRoll(INITIAL_DICE_POOL, [], createCreatureBattleState(),
    { control: INITIAL_PLAYER_STATS.maxControl, maxControl: INITIAL_PLAYER_STATS.maxControl, gold: 0, currentEnemy: result.enemy }, 0, () => 0);
  assert.equal(rolled.rolledIndices.length, INITIAL_DICE_POOL.length);
  const index = INITIAL_DICE_POOL.findIndex((die) => die.id === result.enemy.sealedDie);
  const state = { ...rolled, combatPhase: 'CONTROL_PHASE' as const, dicePool: INITIAL_DICE_POOL,
    equipments: ALL_EQUIPMENT_CATALOG, control: INITIAL_PLAYER_STATS.maxControl, maxControl: INITIAL_PLAYER_STATS.maxControl, gold: 0 };
  assert.equal(performControlReroll(index, state), null);
  assert.equal(performDiceAction('flip', index, state), null);
  assert.deepEqual(resolveRerollChain(INITIAL_DICE_POOL, rolled.rolledIndices, rolled.creatureBattleState, index, [], () => 0, INITIAL_DICE_POOL[0].id), []);
  const next = resolveEnemyRound(result.enemy, attacks([]), [], player, rolled.creatureBattleState);
  assert.equal(next.enemy.sealedDie, undefined);
  const unsealed = performStartBattleRoll(INITIAL_DICE_POOL, [], rolled.creatureBattleState,
    { control: state.control, maxControl: state.maxControl, gold: 0, currentEnemy: next.enemy }, 0, () => 0);
  assert.deepEqual(unsealed.creatureBattleState.sealedDice, []);
});

test('鉤索由額外重骰解除，翻面版本改變不會解除', () => {
  const enemy = withIntent((intent) => !!intent.grapple);
  const first = resolveEnemyRound(enemy, attacks([]), [], player, createCreatureBattleState());
  const grapple = first.enemy.grapple!;
  assert.ok(grapple);
  const round = createCreatureBattleState();
  const caught = resolveEnemyRound(first.enemy, attacks([]), [], player, { ...round, faceVersions: { [grapple.diceId]: 1 } });
  const freed = resolveEnemyRound(first.enemy, attacks([]), [], player, { ...round, rerolledDice: [grapple.diceId] });
  assert.equal(freed.hp - caught.hp, grapple.damage);
});

test('鱷文追加攻擊減少門檻；轉階段只在當輪招式結束之後', () => {
  const boss = createEnemy(MONSTER_CONFIG.find((enemy) => enemy.phases)!.id);
  const intent = boss.intents[0];
  assert.ok('counter' in intent && intent.counter?.type === 'damage_taken');
  const threshold = intent.counter.threshold;
  const damage = threshold - intent.counter.bonusReduction!;
  assert.equal(resolveEnemyIntent(boss, damage).counterTriggered, false);
  assert.equal(resolveEnemyIntent({ ...boss, bonusHits: 1 }, damage).counterTriggered, true);
  const weakened = { ...boss, hp: boss.maxHp * boss.phases![0].below };
  const result = resolveEnemyRound(weakened, attacks([]), [], player, createCreatureBattleState());
  assert.equal(result.events.find((event) => event.kind === 'enemy')?.damage, resolveEnemyIntent(weakened).damage);
  assert.equal(result.enemy.phase, 1);
  assert.equal(result.enemy.intents[0].name, boss.phases![0].intents[0].name);
});

test('鱷文重壓只在該輪真正破盾時暈眩，空盾進場不算', () => {
  const boss = createEnemy(MONSTER_CONFIG.find((enemy) => enemy.phases)!.id);
  const phase = boss.phases![0];
  boss.intents = structuredClone([...phase.intents]) as Enemy['intents'];
  boss.currentIntentIndex = boss.intents.findIndex((intent) => intent.stunOnBreak);
  const empty = resolveEnemyRound({ ...boss, shield: 0 }, attacks([]), [], player, createCreatureBattleState());
  const broken = resolveEnemyRound(boss, attacks([boss.shield]), [], player, createCreatureBattleState());
  assert.ok(empty.events.some((event) => event.kind === 'enemy'));
  assert.ok(broken.events.every((event) => event.kind === 'player'));
});

test('擊殺後追擊保留演出，不累積命中與破招收益', () => {
  const enemy = withRule('hitArmor');
  enemy.hp = 1; enemy.shield = 0; enemy.armor = 0;
  const summary = attacks([1, 1, 1]);
  const result = resolveEnemyRound(enemy, summary, [], player, createCreatureBattleState());
  assert.equal(result.events.length, summary.bonusDice.length);
  assert.equal(result.enemy.hitsTaken, 1);
  assert.equal(result.enemy.bonusHits, 1);
  assert.equal(result.enemy.roundDamage, enemy.hp);
});

test('連擊增傷在同輪累積，回合交界歸零', () => {
  const enemy = withRule('comboVulnerability'); enemy.armor = 0;
  const damage = enemy.maxHp / (enemy.intents.length * INITIAL_DICE_POOL.length);
  const first = resolvePlayerHit(enemy, damage, false);
  const second = resolvePlayerHit(first.enemy, damage, true);
  assert.ok(second.value > first.value);
  const next = finishEnemyRound(second.enemy, resolveEnemyIntent(second.enemy), 0);
  assert.equal(resolvePlayerHit(next, damage, false).value, first.value);
});

test('鱷文橫掃只計不同的土人標籤，同標籤重複及食物均不增加種類', () => {
  const enemy = createEnemy(MONSTER_CONFIG.find((entry) => entry.phases)!.id);
  enemy.currentIntentIndex = enemy.intents.findIndex((intent) => intent.diverseTags);
  const intent = enemy.intents[enemy.currentIntentIndex];
  assert.ok('value' in intent);
  const summary = attacks([]);
  summary.items = summary.items.map((item) => ({ ...item, tags: ['common', 'food'] }));
  const single = resolveEnemyRound(enemy, summary, [], player, createCreatureBattleState());
  assert.equal(single.events[0].damage, intent.value);
  summary.items[0].tags = ['common', 'warrior', 'craftsman', 'food'];
  const diverse = resolveEnemyRound(enemy, summary, [], player, createCreatureBattleState());
  assert.equal(diverse.events[0].damage, Math.ceil(intent.value / 2));
});
