import type { CombatPhase, Dice } from '../../types/game';

export function canReorderDice(phase: CombatPhase, hasEnemy: boolean) {
  return !hasEnemy || phase === 'PREPARATION' || phase === 'VICTORY';
}

/** Insert a whole die at a new position, preserving its identity and all face data. */
export function reorderDice(pool: Dice[], diceId: string, targetIndex: number): Dice[] {
  const from = pool.findIndex((die) => die.id === diceId);
  if (from < 0 || targetIndex < 0 || targetIndex >= pool.length || from === targetIndex) return pool;
  const next = [...pool];
  const [die] = next.splice(from, 1);
  next.splice(targetIndex, 0, die);
  return next;
}
