import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { PLAYER_IMPACT_PRESENTATION as config } from '../../configs/playerImpactConfig';
import { useGameViewport } from '../layout/GameViewportContext';
import { useGameImpactFrame } from './useGameImpactFrame';
import './gameImpactFrame.scss';

export function GameImpactFrame() {
  const { overlay } = useGameViewport();
  const ref = useGameImpactFrame(overlay !== null);
  return overlay && createPortal(<div ref={ref} className="game-impact-frame" aria-hidden="true" style={{
    '--impact-color': config.colors.health,
    '--impact-glow-width': `${config.glowWidth}px`,
    '--impact-edge-width': `${config.edgeWidth}px`,
    zIndex: config.layer,
  } as CSSProperties} />, overlay);
}
