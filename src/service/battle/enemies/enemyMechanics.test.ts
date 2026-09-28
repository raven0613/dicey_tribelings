import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_CONFIG } from '../../../configs/monsters/monsterConfig';
import { INITIAL_DICE_POOL } from '../../../configs/gameConfig';
import { createEnemy } from './enemyFactory';
import { resolveEnemyRound } from './enemyRound';
import { currentIntent, resolveEnemyIntent } from './enemyIntent';
import { resolvePlayerHit, finishEnemyRound } from './enemyMechanics';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState } from '../creatures/creatureState';
import { performStartBattleRoll, performControlReroll } from '../rollService';
import type { BattleComboSummary } from '../../../types/battle';
import type { Enemy } from '../../../types/enemy';

function output(damages: number[] = [], shield = 0): BattleComboSummary {
  const summary = calculateRollResolution(INITIAL_DICE_POOL, [0, 0, 0], []);
  const item = summary.items[0];
  return { ...summary, items: damages.map((damage, index) => ({ ...item, diceId: `die-${index}`, finalDamage: damage })),
    bonusDice: [], repeatAttacks: [], totalShield: shield, reflection: 0, healing: 0 };
}
const round = createCreatureBattleState();
const resolve = (enemies: Enemy[], summary: BattleComboSummary, target = enemies[0].id, shield = summary.totalShield) =>
  resolveEnemyRound(enemies, summary, [], { hp: 1000, shield }, round, target);

test('each strike targets a living enemy, with per-hit overkill and independent hit records', () => {
  const a = createEnemy('r1_grunt', 'a'), b = createEnemy('r1_grunt', 'b'), c = createEnemy('r1_grunt', 'c');
  a.hp = b.hp = c.hp = 5;
  const result = resolve([a, b, c], output([50, 2, 4]), b.id);
  assert.deepEqual(result.events.filter(e => e.kind === 'player').map(e => e.enemy.id), ['b', 'a', 'a']);
  assert.deepEqual(result.enemies.map(e => e.hp), [0, 0, 5]);
  assert.deepEqual(result.actionEnemies.map(e => e.hitsTaken ?? 0), [2, 1, 0]);
  assert.equal(result.events.filter(e => e.kind === 'enemy').length, 1);
  assert.equal(b.hp, 5, 'resolver keeps inputs immutable');
});
test('bonus and repeated attacks retarget and count toward hit conditions', () => {
  const a = createEnemy('r1_grunt', 'a'), b = createEnemy('r2_first', 'b'); a.hp = 1;
  const summary = output([10]);
  summary.bonusDice = [{ id: 'bonus', source: { kind: 'equipment', equipmentId: 'test' }, sourceName: '', bonusDamage: 2, label: '', description: '' }];
  summary.repeatAttacks = [{ diceId: 'die-0', sourceDiceId: 'die-0', damage: 3 }];
  const result = resolve([a, b], summary);
  assert.equal(result.actionEnemies[1].hitsTaken, 2);
  assert.equal(result.actionEnemies[1].hp, b.hp - 5);
  b.hp = summary.bonusDice[0].bonusDamage;
  const defeated = resolve([a, b], summary);
  assert.deepEqual(defeated.events.map(event => event.enemy.id), [a.id, b.id, b.id]);
  assert.deepEqual(defeated.events.map(event => event.damage), [10, 2, 3]);
  assert.deepEqual(defeated.enemies.map(enemy => enemy.hp), [0, 0]);
  assert.deepEqual(defeated.enemies.map(enemy => enemy.hitsTaken), [1, 1]);
});
test('hit armor expires once and cancels exactly one next action', () => {
  const enemy = createEnemy('r2_iron'), layers = enemy.armor!;
  const broken = resolve([enemy], output(Array(layers).fill(1)));
  assert.equal(broken.enemies[0].armor, 0);
  assert.equal(broken.hp, 1000);
  assert.equal(broken.enemies[0].armorStun, false);
  assert.ok(resolve(broken.enemies, output([1])).hp < broken.hp);
});
test('hook is avoidable by full blocking, removable through source damage or rerolls, and absorbed by shield', () => {
  const source = createEnemy('r1_harpoon');
  const intent = currentIntent(source); assert.ok('value' in intent && intent.grapple);
  assert.equal(resolve([source], output([0], intent.value)).enemies[0].grapple, undefined);
  const hooked = resolve([source], output([0])).enemies[0]; assert.ok(hooked.grapple);
  const { breakDamage, damage, diceId } = hooked.grapple;
  const struck = resolve([hooked], output([breakDamage]));
  assert.ok(!struck.events.some(e => e.source === 'grapple'));
  const rerolled = resolveEnemyRound([hooked], output(), [], { hp: 1000, shield: 0 }, { ...round, rerolledDice: [diceId] });
  assert.ok(!rerolled.events.some(e => e.source === 'grapple'));
  const absorbed = resolve([hooked], output([], damage));
  const event = absorbed.events.find(e => e.source === 'grapple')!;
  assert.equal(event.hp, 1000); assert.equal(event.shield, 0);
});
test('only ronin exposes after fully blocked attack, for precisely one player round', () => {
  assert.equal(MONSTER_CONFIG.filter(e => e.intents.some(i => i.exposeOnBlock)).length, 1);
  const enemy = createEnemy('r1_ronin'), intent = currentIntent(enemy); assert.ok('value' in intent);
  assert.equal(resolve([enemy], output()).enemies[0].exposure, undefined);
  const exposed = resolve([enemy], output([], intent.value)).enemies[0];
  assert.equal(exposed.exposure, intent.exposeOnBlock);
  assert.equal(resolvePlayerHit(exposed, 10).value, Math.ceil(10 * intent.exposeOnBlock!));
  assert.equal(resolve([exposed], output()).enemies[0].exposure, undefined);
});
test('dual conditions grant independent partial credit and use generated shield, not remaining shield', () => {
  const first = createEnemy('r2_first'), second = createEnemy('r2_second');
  const firstIntent = currentIntent(first), secondIntent = currentIntent(second);
  assert.ok('value' in firstIntent && 'value' in secondIntent);
  const hits = firstIntent.hitWeaken!, shield = secondIntent.shieldWeaken!;
  const hitOnly = resolve([first, second], output(Array(hits).fill(1)));
  assert.equal(hitOnly.resolutions[first.id].damage, Math.floor(firstIntent.value / 2));
  assert.equal(hitOnly.resolutions[second.id].hits, secondIntent.hits);
  const both = resolve([first, second], output(Array(hits).fill(1), shield), first.id, 0);
  assert.equal(both.resolutions[second.id].hits, secondIntent.hits! - 1);
  const carriedOnly = resolve([first, second], output(), first.id, shield * 2);
  assert.equal(carriedOnly.resolutions[second.id].hits, secondIntent.hits);
});
test('command affects survivors next round once, can be interrupted, and never buffs the current round', () => {
  const leader = createEnemy('r2_chief'), minion = createEnemy('r2_blades');
  const command = currentIntent(leader); assert.ok(command.command && command.counter?.type === 'damage_taken');
  const result = resolve([leader, minion], output());
  assert.equal(result.resolutions[minion.id].damage, resolveEnemyIntent(minion).damage);
  assert.equal(result.enemies[1].strength, command.command);
  const next = resolve(result.enemies, output());
  assert.equal(next.resolutions[minion.id].damage, resolveEnemyIntent(minion).damage + command.command);
  assert.equal(next.enemies[1].strength, 0);
  const interrupted = resolve([leader, minion], output([command.counter.threshold]));
  assert.equal(interrupted.enemies[1].strength, 0);
});
test('contraband deadline is the enemy action: player turn three can still secure the extra reward', () => {
  let enemy = createEnemy('r2_market');
  for (let n = 1; n < enemy.traits!.contraband!.deadline; n++) enemy = resolve([enemy], output()).enemies[0];
  assert.equal(enemy.prizeLost, false);
  assert.equal(resolve([enemy], output([enemy.hp])).enemies[0].prizeLost, false);
  assert.equal(resolve([enemy], output()).enemies[0].prizeLost, true);
});
test('fury queues next round, ignores pending-round rerolls and resets after its heavy attack', () => {
  const enemy = createEnemy('r3_warden'), rule = enemy.traits!.rerollFury!;
  const result = resolveEnemyRound([enemy], output(), [], { hp: 1000, shield: 0 }, { ...round, manualRerolls: rule.threshold });
  assert.equal(result.resolutions[enemy.id].damage, resolveEnemyIntent(enemy).damage);
  assert.deepEqual(currentIntent(result.enemies[0]), rule.intent);
  const next = resolveEnemyRound(result.enemies, output(), [], { hp: 1000, shield: 0 }, { ...round, manualRerolls: rule.threshold });
  assert.equal(next.enemies[0].fury, 0); assert.equal(next.enemies[0].furyPending, false);
});
test('watch suppresses only the marked normal hit and manual reroll transfers it before automatic chains', () => {
  const enemy = createEnemy('r3_prisoner'), summary = output([10, 10]);
  summary.repeatAttacks = [{ diceId: 'die-0', sourceDiceId: 'die-0', damage: 10 }];
  const result = resolveEnemyRound([enemy], summary, [], { hp: 1000, shield: 0 }, { ...round, watchedDieId: 'die-0' });
  assert.deepEqual(result.events.filter(e => e.kind === 'player').map(e => e.damage), [5, 10, 10]);
  const rolled = performStartBattleRoll(INITIAL_DICE_POOL, [], round, { control: 3, maxControl: 3, gold: 0, enemies: [enemy] }, 0, () => 0);
  const state = { ...rolled, dicePool: INITIAL_DICE_POOL, equipments: [], enemies: [enemy], control: 3, maxControl: 3, gold: 0, combatPhase: 'CONTROL_PHASE' as const };
  assert.equal(state.creatureBattleState.watchedDieId, INITIAL_DICE_POOL[1].id);
  const reroll = performControlReroll(0, state, () => 0)!;
  assert.ok(reroll.steps.every(step => step.state.manualRerolls === 1 && step.state.watchedDieId === INITIAL_DICE_POOL[0].id));
});
test('boss half-health transition happens at round boundary and fatigue does not loop back to strongest hit', () => {
  const boss = createEnemy('r3_boss');
  const hit = resolvePlayerHit(boss, Math.ceil(boss.hp / 2));
  assert.equal(hit.enemy.phase, 0);
  const next = finishEnemyRound(hit.enemy, resolveEnemyIntent(hit.enemy), false, 0);
  assert.equal(next.phase, 1);
  let tired = createEnemy('r2_club');
  for (let n = 0; n < tired.intents.length + 1; n++) tired = finishEnemyRound(tired, resolveEnemyIntent(tired), false, 0);
  assert.equal(tired.currentIntentIndex, tired.intents.length - 1);
});

test('automatic prankster chains add actual rerolls without moving watch or adding fury actions', async () => {
  const { configuredDice } = await import('../../dice/diceFactory');
  const pool = ['a', 'b'].map(id => configuredDice(id, id, 'd6', 'emerald', Array.from({ length: 6 }, () => ['prankster', 3])));
  const state = { dicePool: pool, rolledIndices: [0, 0], equipments: [], combatPhase: 'CONTROL_PHASE' as const,
    control: 3, maxControl: 3, gold: 0, creatureBattleState: { ...round, watchedDieId: 'b' } };
  const result = performControlReroll(0, state, () => 0)!;
  assert.ok(result.steps.length > 1);
  assert.ok(result.steps.every(step => step.state.manualRerolls === 1 && step.state.watchedDieId === 'a'));
  assert.equal(result.steps.at(-1)!.state.rerollCount, result.steps.length);
});

test('lethal reflection with simultaneous deaths remains player defeat input', () => {
  const enemy = createEnemy('r1_patrol'); enemy.hp = 1;
  const summary = output(); summary.reflection = 1;
  const result = resolveEnemyRound([enemy], summary, [], { hp: 1, shield: 0 }, round);
  assert.equal(result.hp, 0); assert.equal(result.enemies[0].hp, 0);
});
