import { MONSTER_CONFIG } from '../../../configs/monsters/monsterConfig';
import { MONSTER_BALANCE_CONFIG, getEncounterDamageBudget } from '../../../configs/monsters/monsterBalanceConfig';
import { createEnemy } from './enemyFactory';
import { resolveEnemyRound } from './enemyRound';
import { calculateRollResolution } from '../battleEngine';
import { configuredDice } from '../../dice/diceFactory';
import { createCreatureBattleState } from '../creatures/creatureState';

type Scenario = keyof typeof MONSTER_BALANCE_CONFIG.scenarios;
export interface MonsterBalanceResult {
  monsterId: string;
  scenario: Scenario;
  medianTurns: number;
  p90Turns: number;
  meanIncomingDamage: number;
  counterRate: number;
  stalledRuns: number;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * 輸出包絡壓力測試，共用正式 Intent 結算；每回合獨立均勻取樣。
 * 玩家假設具有無限 HP，記錄擊殺前傷害暴露量；數值代表承傷需求。
 * Control、玩家護盾、貼紙、裝備觸發與補給交由完整 Run 模擬驗證。
 */
export function simulateMonsterBalance(): MonsterBalanceResult[] {
  const config = MONSTER_BALANCE_CONFIG;
  const results: MonsterBalanceResult[] = [];
  for (const monster of MONSTER_CONFIG) {
    for (const scenario of Object.keys(config.scenarios) as Scenario[]) {
      // 各情境共用亂數序列，單獨比較輸出倍率的敏感度。
      const random = seededRandom(config.seed);
      const turns: number[] = [];
      let incomingDamage = 0;
      let counterOpportunities = 0;
      let counters = 0;
      let stalledRuns = 0;
      for (let run = 0; run < config.runsPerScenario; run++) {
        let enemy = createEnemy(monster.id);
        const rolls = Array.from({ length: config.maxTurns }, random);
        let turn = 0;
        while (enemy.hp > 0 && turn < config.maxTurns) {
          const variance = config.rollRange[0] + rolls[turn] * (config.rollRange[1] - config.rollRange[0]);
          const damage = Math.max(1, Math.ceil(getEncounterDamageBudget(monster.id)
            * config.scenarios[scenario] * variance));
          turn++;
          const intent = enemy.intents[enemy.currentIntentIndex];
          if ('counter' in intent && intent.counter) counterOpportunities++;
          const diceCount = config.diceCountByRegion[monster.region];
          const pool = Array.from({ length: diceCount }, (_, index) => configuredDice(`envelope-${index}`, '輸出包絡', 'd6', 'emerald',
            Array.from({ length: 6 }, () => ['food', damage / diceCount] as const)));
          const round = { ...createCreatureBattleState(), round: turn };
          const summary = calculateRollResolution(pool, pool.map(() => 0), [], round);
          const resolution = resolveEnemyRound(enemy, summary, [], { hp: config.playerHp, shield: 0 }, round);
          incomingDamage += config.playerHp - resolution.hp;
          if (resolution.resolution.counterTriggered) counters++;
          enemy = resolution.enemy;
        }
        if (enemy.hp > 0) stalledRuns++;
        turns.push(turn);
      }
      turns.sort((a, b) => a - b);
      results.push({
        monsterId: monster.id, scenario,
        medianTurns: turns[Math.ceil(turns.length * 0.5) - 1],
        p90Turns: turns[Math.ceil(turns.length * 0.9) - 1],
        meanIncomingDamage: incomingDamage / config.runsPerScenario,
        counterRate: counterOpportunities ? counters / counterOpportunities : 0,
        stalledRuns,
      });
    }
  }
  return results;
}
