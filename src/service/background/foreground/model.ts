import type { BackgroundScene } from '../../../types/background';
import type { MotionBody } from '../../../types/foregroundMotion';
import { FOREGROUND_MOTION as config } from '../../../configs/backgrounds/foregroundMotionConfig';
import { addImpulse, advanceSpring, advanceStone, isMoving } from './physics';

export function createForegroundModel(scene: BackgroundScene) {
  const ground: MotionBody = { position: 0, velocity: 0 };
  const stones = scene.props.filter(prop => prop.motion === 'stone').map((): MotionBody => ({ position: 0, velocity: 0 }));
  const vegetation = [...scene.hanging.map(item => item.motion),
    ...[...scene.grass].sort((a, b) => b.id - a.id).map(group => group.motion)];
  const springs = vegetation.map((): MotionBody => ({ position: 0, velocity: 0 }));
  const bends = new Float32Array(springs.length);
  const reset = () => {
    for (const body of [ground, ...stones, ...springs]) { body.position = 0; body.velocity = 0; }
    bends.fill(0);
  };
  const advance = (seconds: number) => {
    // Contact uses small steps; oscillators themselves use the exact time solution.
    const count = Math.ceil(seconds / config.stepSeconds);
    if (!count) return;
    const dt = seconds / count;
    for (let step = 0; step < count; step++) {
      advanceSpring(ground, config.ground, dt);
      for (const stone of stones) advanceStone(stone, ground, dt);
    }
    for (let i = 0; i < springs.length; i++) {
      advanceSpring(springs[i], vegetation[i].spring, seconds);
      bends[i] = springs[i].position;
    }
  };
  return {
    ground, stones, bends, reset, advance,
    impulse(gain: number) {
      addImpulse(ground, config.ground, gain);
      for (let i = 0; i < springs.length; i++) addImpulse(springs[i], vegetation[i].spring, gain * vegetation[i].gain);
    },
    get active() { return isMoving(ground) || stones.some(isMoving) || springs.some(isMoving); },
  };
}
