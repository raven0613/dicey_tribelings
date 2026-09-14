import type { WaitForAttackMotion } from '../../service/battle/battleSettlement';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Observe transitions only after React commits the pose and the browser starts rendering it. */
export const waitForDiceAttackMotion: WaitForAttackMotion = async (index, bonus, isCurrent) => {
  await nextFrame();
  await nextFrame();
  if (!isCurrent()) return false;
  const attribute = bonus ? 'data-attack-bonus' : 'data-attack-die';
  const die = document.querySelector<HTMLElement>(`[${attribute}="${index}"]`);
  if (!die) return false;
  const body = die.querySelector('.battle-die-art');
  while (isCurrent() && die.isConnected) {
    // Exclude the phantom's infinite float and decorative child animations.
    const animations = [...die.getAnimations(), ...(body?.getAnimations() ?? [])];
    if (!animations.length) return true;
    const completed = await Promise.all(animations.map((animation) => animation.finished.then(() => true, () => false)));
    if (completed.every(Boolean)) return isCurrent() && die.isConnected;
    // Resizing can replace a transition; cancellation is not a completed impact.
    await nextFrame();
  }
  return false;
};
