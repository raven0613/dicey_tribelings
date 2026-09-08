import type { BattleStoreMethods } from './battleSettlement';
import { BATTLE_PRESENTATION as timing } from '../../configs/battleConfig';
import { combatNumber } from './creatures/creatureState';
import { soundService } from '../audio/soundService';
import { waitForAnimation } from './settlementAnimation';

/** 命中節拍同時提交受傷與視覺回饋，返回完成後交還回合流程。 */
export async function animateEnemyAttack({ get, set }: BattleStoreMethods, damage: number,
  heavy: boolean, isCurrent: () => boolean): Promise<void> {
  const feedback = { heavy, healthDamage: 0, shieldDamage: 0 };
  set({ enemyAttack: { ...feedback, stage: 'windup' } });
  await waitForAnimation(timing.enemyWindupMs);
  if (!isCurrent()) return;
  set({ enemyAttack: { ...feedback, stage: 'dash' } });
  await waitForAnimation(timing.enemyDashMs);
  if (!isCurrent()) return;
  const state = get();
  const shieldDamage = Math.min(state.playerShield, damage);
  const playerHp = combatNumber(Math.max(0, state.playerHp - (damage - shieldDamage)));
  const impact = { heavy, shieldDamage, healthDamage: combatNumber(state.playerHp - playerHp) };
  soundService.playEnemyHit(heavy);
  set({ playerHp, playerShield: combatNumber(state.playerShield - shieldDamage), playerShieldDisplay: null,
    enemyAttack: { ...impact, stage: 'impact' } });
  await waitForAnimation(timing.enemyImpactMs);
  if (!isCurrent()) return;
  set({ enemyAttack: { ...impact, stage: 'recoil' } });
  await waitForAnimation(timing.enemyRecoilMs);
  if (!isCurrent()) return;
  set({ enemyAttack: null });
}
