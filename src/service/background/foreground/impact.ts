import type { CombatImpact, EnemyAttackFeedback } from '../../../types/battle';
import { FOREGROUND_MOTION } from '../../../configs/backgrounds/foregroundMotionConfig';

export function getForegroundImpact(impact: CombatImpact | null, previous: CombatImpact | null,
  attack: Pick<EnemyAttackFeedback, 'stage' | 'heavy' | 'healthDamage' | 'shieldDamage'> | null): number {
  if (impact === previous || impact?.kind !== 'enemy' || attack?.stage !== 'impact'
    || attack.healthDamage + attack.shieldDamage <= 0) return 0;
  return attack.heavy ? FOREGROUND_MOTION.heavyGain : 1;
}
