import type { CSSProperties } from 'react';
import { ENEMY_STRIKE as config } from '../../configs/monsters/enemyStrikeConfig';

export function EnemyStrikeEffects({ src, strength }: { src: string; strength: number }) {
  return <div className="enemy-strike-effects" aria-hidden="true">
    {config.trails.map((trail, index) => <img
      key={index}
      src={src}
      alt=""
      draggable={false}
      className="enemy-strike-trail"
      style={{
        '--trail-distance': `${-trail.distance * strength}px`,
        '--trail-opacity': trail.opacity * strength,
        '--trail-stretch': trail.stretch,
      } as CSSProperties}
    />)}
    <div className="enemy-speed-lines" style={{
      '--speed-color': config.speedLines.color,
      '--speed-opacity': Math.min(1, config.speedLines.opacity * strength),
      top: config.speedLines.top,
    } as CSSProperties}>
      {config.speedLines.lines.map((line, index) => <span
        key={index}
        style={{
          left: line.left,
          width: line.width,
          height: line.height * strength,
        }}
      />)}
    </div>
  </div>;
}
