import type { BackgroundScene } from '../../../types/background';
import { FOREGROUND_MOTION as config } from '../../../configs/backgrounds/foregroundMotionConfig';
import { createForegroundModel } from './model';
import { createForegroundMeshes } from './mesh';
import { createForegroundRenderer } from './renderer';

export function createForegroundController(root: HTMLDivElement, canvas: HTMLCanvasElement, scene: BackgroundScene) {
  const model = createForegroundModel(scene);
  const meshes = createForegroundMeshes(scene);
  const ground = root.querySelector<HTMLElement>('[data-ground]')!;
  const stones = Array.from(root.querySelectorAll<HTMLElement>('[data-stone]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, lastTime = 0, scale = 1, disposed = false;
  let renderer: ReturnType<typeof createForegroundRenderer> = null;
  const paint = () => {
    ground.style.transform = `translateY(${model.ground.position}px)`;
    stones.forEach((element, i) => { element.style.transform = `translateY(${model.stones[i].position}px)`; });
    renderer?.render(model.bends);
  };
  const reset = () => {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    model.reset(); paint();
  };
  const advanceTo = (now: number) => {
    if (lastTime) {
      const elapsed = (now - lastTime) / 1000;
      if (elapsed > config.maxFrameSeconds) model.reset();
      else model.advance(elapsed);
    }
    lastTime = now;
  };
  const tick = () => {
    frame = 0;
    // Use one clock for synchronous impacts and frames, even when impacts originate in another RAF callback.
    advanceTo(performance.now()); paint();
    if (model.active) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  };
  const buildRenderer = () => {
    root.dataset.renderer = 'static';
    try {
      const next = createForegroundRenderer(canvas, scene.assetDirectory, meshes);
      renderer = next;
      if (!next) return;
      next.resize(scale);
      next.loaded.then(ready => {
        if (!ready || disposed || renderer !== next) return;
        next.render(model.bends);
        root.dataset.renderer = 'ready';
      }).catch(error => {
        if (disposed || renderer !== next) return;
        console.error('Foreground textures could not be loaded', error);
        next.destroy(); renderer = null;
      });
    } catch (error) {
      console.error('Foreground rendering unavailable', error);
      renderer = null;
    }
  };
  const loseContext = (event: Event) => {
    event.preventDefault();
    root.dataset.renderer = 'static';
    renderer?.destroy(); renderer = null;
    reset();
  };
  const visibilityChanged = () => { if (document.hidden) reset(); };
  const resize = (nextScale: number) => {
    scale = nextScale; renderer?.resize(scale); paint();
  };
  const windowResized = () => resize(scale);
  canvas.addEventListener('webglcontextlost', loseContext);
  canvas.addEventListener('webglcontextrestored', buildRenderer);
  document.addEventListener('visibilitychange', visibilityChanged);
  reduced.addEventListener('change', reset);
  window.addEventListener('resize', windowResized);
  buildRenderer();
  return {
    reset, resize,
    impact(gain: number) {
      if (disposed || document.hidden || reduced.matches) return;
      advanceTo(performance.now());
      model.impulse(gain);
      if (!frame) frame = requestAnimationFrame(tick);
    },
    destroy() {
      disposed = true;
      reset(); renderer?.destroy(); renderer = null;
      root.dataset.renderer = 'static';
      ground.style.removeProperty('transform');
      stones.forEach(element => element.style.removeProperty('transform'));
      canvas.removeEventListener('webglcontextlost', loseContext);
      canvas.removeEventListener('webglcontextrestored', buildRenderer);
      document.removeEventListener('visibilitychange', visibilityChanged);
      reduced.removeEventListener('change', reset);
      window.removeEventListener('resize', windowResized);
    },
  };
}
