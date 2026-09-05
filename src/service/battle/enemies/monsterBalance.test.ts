import assert from 'node:assert/strict';
import test from 'node:test';
import { MONSTER_CONFIG } from '../../../configs/monsters/monsterConfig';
import { MONSTER_BALANCE_CONFIG } from '../../../configs/monsters/monsterBalanceConfig';
import { INITIAL_DICE_POOL, INITIAL_EQUIPMENT } from '../../../configs/gameConfig';
import { calculateRollResolution } from '../battleEngine';
import { simulateMonsterBalance } from './monsterBalanceSimulation';

test('starting dice enumerate all rolls through the production damage calculation', (context) => {
  const damage: number[] = [];
  for (let a = 0; a < INITIAL_DICE_POOL[0].faces.length; a++) {
    for (let b = 0; b < INITIAL_DICE_POOL[1].faces.length; b++) {
      for (let c = 0; c < INITIAL_DICE_POOL[2].faces.length; c++) {
        damage.push(calculateRollResolution(INITIAL_DICE_POOL, [a, b, c], INITIAL_EQUIPMENT).totalDamage);
      }
    }
  }
  const mean = damage.reduce((sum, value) => sum + value, 0) / damage.length;
  const regionOneBudget = MONSTER_BALANCE_CONFIG.regions[1].damagePerTurn;
  assert.ok(Math.abs(mean - regionOneBudget) / regionOneBudget <= 0.2);
  context.diagnostic(`Starter: ${damage.length} rolls, mean ${mean.toFixed(2)}, range ${Math.min(...damage)}–${Math.max(...damage)}; zero Control.`);
});

test('seeded output envelopes meet median turn targets and retain weak-build progress', (context) => {
  const results = simulateMonsterBalance();
  assert.deepEqual(results, simulateMonsterBalance());
  assert.equal(results.length, MONSTER_CONFIG.length * 3);
  for (const monster of MONSTER_CONFIG) {
    const rows = results.filter((row) => row.monsterId === monster.id);
    const weak = rows.find((row) => row.scenario === 'weak')!;
    const typical = rows.find((row) => row.scenario === 'typical')!;
    const strong = rows.find((row) => row.scenario === 'strong')!;
    const [min, max] = MONSTER_BALANCE_CONFIG.turnTargets[monster.rank];
    assert.ok(typical.medianTurns >= min && typical.medianTurns <= max,
      `${monster.name}: typical median ${typical.medianTurns}, target ${min}–${max}`);
    assert.ok(weak.medianTurns >= typical.medianTurns);
    const weakMax = max + MONSTER_BALANCE_CONFIG.weakExtraTurns;
    assert.ok(weak.medianTurns <= weakMax, `${monster.name}: weak median ${weak.medianTurns} exceeds ${weakMax}`);
    assert.ok(typical.medianTurns >= strong.medianTurns);
    for (const row of rows) assert.equal(row.stalledRuns, 0, `${monster.name}/${row.scenario} stalled`);
    context.diagnostic(`${monster.name}: turns weak/typical/strong ${weak.medianTurns}/${typical.medianTurns}/${strong.medianTurns}; typical p90 ${typical.p90Turns}, exposure ${typical.meanIncomingDamage.toFixed(1)}, counters ${(typical.counterRate * 100).toFixed(0)}%`);
    const attackThresholds = monster.intents.filter((intent) => 'counter' in intent && intent.counter?.type === 'damage_taken');
    if (attackThresholds.length) {
      assert.ok(typical.counterRate > 0 && typical.counterRate < 1, `${monster.name}: threshold always/never met`);
    }
    if (monster.id === 'rivet_guard') assert.ok(typical.counterRate > 0 && typical.counterRate < 1);
    const shieldPerCycle = monster.intents.reduce((sum, intent) => sum + (intent.type === 'defend' ? intent.value : 0), 0);
    const weakestDamage = Math.max(1, Math.round(MONSTER_BALANCE_CONFIG.regions[monster.region].damagePerTurn
      * MONSTER_BALANCE_CONFIG.scenarios.weak * MONSTER_BALANCE_CONFIG.rollRange[0]));
    assert.ok(weakestDamage * monster.intents.length > shieldPerCycle, `${monster.name}: shield renewal prevents HP progress`);
  }
});
