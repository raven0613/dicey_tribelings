import type { WaitForEnemyAttackMotion } from '../../service/battle/battleSettlement';

const nextFrame = () => new Promise<void>(resolve => {
  requestAnimationFrame(() => resolve());
});

/** Wait for the committed body animation; child trails and hit flashes are independent. */
export const waitForEnemyAttackMotion: WaitForEnemyAttackMotion = async isCurrent => {
  await nextFrame();
  await nextFrame();
  if (!isCurrent()) return false;

  const body = document.getElementById('battle-enemy-target');
  if (!body) return false;

  while (isCurrent() && body.isConnected) {
    const animations = body.getAnimations();
    if (!animations.length) return true;

    const completed = await Promise.all(animations.map(animation =>
      animation.finished.then(() => true, () => false)));
    if (completed.every(Boolean)) return isCurrent() && body.isConnected;
    await nextFrame();
  }
  return false;
};
