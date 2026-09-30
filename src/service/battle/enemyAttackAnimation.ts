import type { BattleStoreMethods } from './battleSettlement';
import { ENEMY_STRIKE } from '../../configs/monsters/enemyStrikeConfig';
import { combatNumber } from './creatures/creatureState';
import { soundService } from '../audio/soundService';
import { waitForAnimation } from './settlementAnimation';
import { getEnemyStrikeStrength } from './presentation/enemyStrike';
import type { EnemyAttackFeedback, EnemyDamageSource } from '../../types/battle';

interface EnemyAttackResult {
  hp: number;
  shield: number;
  damage: number;
  source?: EnemyDamageSource;
}

/** Each completed visual phase advances the attack; contact commits damage and feedback together. */
export async function animateEnemyAttack(
  { get, set, waitForEnemyMotion }: BattleStoreMethods,
  result: EnemyAttackResult,
  heavy: boolean,
  isCurrent: () => boolean,
): Promise<boolean> {
  const initial = get();
  const enemy = initial.enemies.find(item => item.id === initial.activeEnemyId)!;
  const feedback = {
    heavy,
    strength: getEnemyStrikeStrength(enemy.definitionId, result.damage, heavy),
    healthDamage: 0,
    shieldDamage: 0,
  };
  const wait = async (stage: EnemyAttackFeedback['stage']) => {
    if (waitForEnemyMotion) return waitForEnemyMotion(isCurrent);
    await waitForAnimation(ENEMY_STRIKE.timing[stage]);
    return isCurrent();
  };

  set({ enemyAttack: { ...feedback, stage: 'windup' } });
  if (!await wait('windup') || !isCurrent()) return false;
  set({ enemyAttack: { ...feedback, stage: 'dash' } });
  if (!await wait('dash') || !isCurrent()) return false;

  const state = get();
  const impact = {
    ...feedback,
    shieldDamage: combatNumber(state.playerShield - result.shield),
    healthDamage: combatNumber(state.playerHp - result.hp),
  };
  soundService.playEnemyHit(heavy);
  set({
    playerHp: result.hp,
    playerShield: result.shield,
    playerShieldDisplay: null,
    combatImpact: { kind: 'enemy', source: result.source },
    enemyAttack: { ...impact, stage: 'impact' },
  });
  if (!await wait('impact') || !isCurrent()) return false;
  set({ enemyAttack: { ...impact, stage: 'recoil' } });
  if (!await wait('recoil') || !isCurrent()) return false;
  set({ enemyAttack: null });
  return true;
}
