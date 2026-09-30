import type { CSSProperties, ReactNode } from 'react';
import { BACKGROUND_PRESENTATION as config, BACKGROUND_SCENES } from '../../configs/backgrounds/backgroundConfig';
import { BackgroundScenery } from './BackgroundScenery';
import './background.scss';

export function GameScene({ children }: { children: ReactNode }) {
  const scene = BACKGROUND_SCENES[config.scene];
  return <div className="app-wrapper" style={{
    backgroundColor: scene.color,
    '--background-width': `${config.width}px`,
    '--background-baseline-bottom': `${scene.baselineBottom}px`,
    '--background-baseline-top': `${scene.baselineTop}px`,
    '--scene-enemy-layer': config.layers.enemies,
    '--scene-attacking-enemy-layer': config.layers.attackingEnemies,
    '--scene-interface-layer': config.layers.interface,
  } as CSSProperties}>
    <BackgroundScenery scene={scene} />
    {children}
  </div>;
}
