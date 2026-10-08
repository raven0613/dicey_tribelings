import assert from 'node:assert/strict';
import test from 'node:test';
import { MONSTER_CONFIG } from '../../configs/monsters/monsterConfig';
import { INITIAL_PLAYER_STATS } from '../../configs/gameConfig';
import { createEnemy } from '../battle/enemies/enemyFactory';
import { currentIntent } from '../battle/enemies/enemyIntent';
import { resolveEnemyRound } from '../battle/enemies/enemyRound';
import { calculateRollResolution } from '../battle/battleEngine';
import { createCreatureBattleState } from '../battle/creatures/creatureState';
import { enemyActionDetails } from './combatDetails';
import { useGameStore } from '../../store/gameStore';
import { RunRecorder } from './recorder';
import { D6_FACE_VALUES } from '../../configs/creatures/diceValueConfig';
import { configuredDice } from '../dice/diceFactory';
import { getPaidRerollCost } from '../battle/rerollCost';

test('actual per-enemy damage reconciles shield and HP including overkill and interrupted prefixes', () => {
  const definition = MONSTER_CONFIG.find((item) =>
    item.intents.some((intent) => 'hits' in intent && intent.hits! > 1),
  )!;
  const enemy = createEnemy(definition.id);
  enemy.currentIntentIndex = enemy.intents.findIndex(
    (intent) => 'hits' in intent && intent.hits! > 1,
  );
  const round = createCreatureBattleState();
  const summary = calculateRollResolution([], [], [], round);
  const player = { hp: INITIAL_PLAYER_STATS.hp, shield: 1 };
  const forecast = resolveEnemyRound([enemy], summary, [], player, round);
  const records = enemyActionDetails(
    forecast.events,
    forecast.actionEnemies,
    forecast.resolutions,
    player,
    true,
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].hpLoss, player.hp - forecast.hp);
  assert.equal(records[0].absorbed, player.shield - forecast.shield);
  assert.equal(records[0].hits, forecast.resolutions[enemy.id].hits);
  const first = enemyActionDetails(
    forecast.events.slice(0, 1),
    forecast.actionEnemies,
    forecast.resolutions,
    player,
    false,
  );
  assert.equal(first[0].hits, 1);
  const fragile = { hp: 1, shield: 0 };
  const lethal = resolveEnemyRound([enemy], summary, [], fragile, round);
  const damage = enemyActionDetails(
    lethal.events,
    lethal.actionEnemies,
    lethal.resolutions,
    fragile,
    true,
  )[0];
  assert.equal(damage.hpLoss, fragile.hp);
  assert.ok(damage.damage > damage.hpLoss);
});

test('counter cancellation records successful zero-damage actions', () => {
  const definition = MONSTER_CONFIG.find((item) =>
    item.intents.some(
      (intent) => intent.counter?.type === 'damage_taken' && intent.counter.effect === 'cancel',
    ),
  )!;
  const enemy = createEnemy(definition.id);
  enemy.currentIntentIndex = enemy.intents.findIndex(
    (intent) => intent.counter?.type === 'damage_taken' && intent.counter.effect === 'cancel',
  );
  const counter = currentIntent(enemy).counter!;
  assert.ok(counter.type === 'damage_taken');
  enemy.roundDamage = counter.threshold;
  const round = createCreatureBattleState();
  const player = { hp: INITIAL_PLAYER_STATS.hp, shield: 0 };
  const forecast = resolveEnemyRound(
    [enemy],
    calculateRollResolution([], [], [], round),
    [],
    player,
    round,
  );
  const records = enemyActionDetails(
    forecast.events,
    forecast.actionEnemies,
    forecast.resolutions,
    player,
    true,
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].counterTriggered, true);
  assert.equal(records[0].cancelled, true);
  assert.equal(records[0].hits, 0);
  assert.equal(records[0].hpLoss, 0);
});

test('manual costs and chain rerolls are recorded when each die commits, not when queued', () => {
  useGameStore.getState().restartGame();
  const dicePool = ['a', 'b'].map((id) =>
    configuredDice(
      id,
      id,
      'd6',
      'amber',
      D6_FACE_VALUES.map((value) => ['prankster', value]),
    ),
  );
  const gold = getPaidRerollCost(0, []);
  useGameStore.setState({
    dicePool,
    equipments: [],
    control: 0,
    gold,
    combatPhase: 'CONTROL_PHASE',
    rolledIndices: dicePool.map(() => 0),
    creatureBattleState: { ...createCreatureBattleState(), round: 1 },
    pendingPaidRerollDiceId: dicePool[0].id,
  });
  let time = 0;
  const recorder = new RunRecorder('test', useGameStore.getState(), time, 'test', true);
  const unsubscribe = useGameStore.subscribe((state, previous) =>
    recorder.observe(state, previous, ++time),
  );
  try {
    useGameStore.getState().confirmPaidReroll(false);
    assert.ok(useGameStore.getState().pendingRerolls.length > 0);
    assert.equal(recorder.record.decisions!.length, 1);
    const first = recorder.record.decisions![0];
    assert.equal(first.resources.gold.before - first.resources.gold.after, gold);
    assert.equal(first.rerolls![0].reason, 'manual');
    assert.equal(first.rerolls![0].before.faceIndex, 0);
    assert.equal(first.rerolls![0].after.faceIndex, useGameStore.getState().rolledIndices[0]);
    const queued = useGameStore.getState().pendingRerolls.length;
    while (useGameStore.getState().activeRerollingIndex !== null) {
      useGameStore.getState().finishRerollAnimation(useGameStore.getState().activeRerollingIndex!);
    }
    assert.equal(recorder.record.decisions!.length, queued + 1);
    assert.ok(
      recorder.record
        .decisions!.slice(1)
        .every(
          (item) =>
            item.rerolls![0].reason === 'chain' &&
            item.resources.gold.before === item.resources.gold.after,
        ),
    );
  } finally {
    unsubscribe();
  }
});

test('teacher rerolls preserve the teacher identity and spend neither gold nor Control', () => {
  useGameStore.getState().restartGame();
  const dicePool = ['teacher', 'warrior'].map((id) =>
    configuredDice(
      id,
      id,
      'd6',
      'amber',
      D6_FACE_VALUES.map((value) => [id as 'teacher' | 'warrior', value]),
    ),
  );
  useGameStore.setState({
    dicePool,
    equipments: [],
    combatPhase: 'CONTROL_PHASE',
    rolledIndices: [0, 0],
    creatureBattleState: {
      ...createCreatureBattleState(),
      round: 1,
      teachersAvailable: [dicePool[0].id],
    },
  });
  useGameStore.getState().setDiceAction(`teacher:${dicePool[0].id}`);
  if (useGameStore.getState().activeRerollingIndex === null)
    useGameStore.getState().useControlReroll(1);
  const decision = useGameStore.getState().telemetryDecision!;
  assert.equal(decision.rerolls![0].reason, 'teacher');
  assert.equal(decision.rerolls![0].teacherId, dicePool[0].id);
  assert.equal(decision.resources.gold.after, decision.resources.gold.before);
  assert.equal(decision.resources.control.after, decision.resources.control.before);
});
