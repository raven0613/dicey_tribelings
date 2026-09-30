import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Crosshair } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/gameStore';
import { getEnemyAppearance } from '../../configs/monsters/enemyAppearanceConfig';
import { ENEMY_STRIKE as config } from '../../configs/monsters/enemyStrikeConfig';
import { ENEMY_PRESENTATION } from '../../configs/monsters/enemyPresentationConfig';
import { getGameRect } from '../../service/layout/gameViewport';
import type { Enemy } from '../../types/enemy';
import { useEnemyHit } from './useEnemyHit';
import { EnemyVitals } from './EnemyVitals';
import { DamagePopLayer } from './DamagePopLayer';
import { EnemyStrikeEffects } from './EnemyStrikeEffects';
import './enemyStrike.scss';

export function EnemyFigure({ enemy }: { enemy: Enemy }) {
  const { selectedEnemyId, activeEnemyId, enemyAttack, combatPhase, selectEnemy, damagePops } = useGameStore(useShallow(state => ({
    selectedEnemyId: state.selectedEnemyId,
    activeEnemyId: state.activeEnemyId,
    enemyAttack: state.enemyAttack,
    combatPhase: state.combatPhase,
    selectEnemy: state.selectEnemy,
    damagePops: state.damagePops,
  })));
  const anchor = useRef<HTMLDivElement>(null);
  const strike = useRef<HTMLDivElement>(null);
  const { body, flash } = useEnemyHit(enemy.id);
  const [distance, setDistance] = useState(0);
  const active = activeEnemyId === enemy.id;
  const selected = selectedEnemyId === enemy.id;
  const attack = active ? enemyAttack : null;
  const stage = attack?.stage ?? 'idle';
  const strength = attack?.strength ?? 1;
  const appearance = getEnemyAppearance(enemy.definitionId);
  const canSelect = enemy.hp > 0 && ['PREPARATION', 'ROLLING', 'CONTROL_PHASE'].includes(combatPhase);

  useLayoutEffect(() => {
    if (stage !== 'windup') return;
    // Measure the resting image, excluding animated transforms and the surrounding UI.
    const origin = getGameRect(anchor.current!);
    const target = getGameRect(document.getElementById('battle-player-target')!);
    setDistance(Math.max(0, target.top - origin.bottom) + config.dash.overlap * strength);
  }, [stage, strength]);

  const motionStyle = {
    '--strike-y': `${distance}px`,
    '--windup-y': `${-config.windup.distance * strength}px`,
    '--windup-x-scale': 1 + config.windup.widen * strength,
    '--windup-y-scale': 1 - config.windup.compress * strength,
    '--dash-x-scale': 1 - config.dash.narrow * strength,
    '--dash-y-scale': 1 + config.dash.stretch * strength,
    '--contact-x-scale': 1 + config.impact.widen * strength,
    '--contact-y-scale': 1 - config.impact.compress * strength,
    '--rebound-y': `${distance - config.impact.rebound * strength}px`,
    '--rebound-y-scale': 1 + config.impact.reboundStretch * strength,
    '--windup-duration': `${config.timing.windup}ms`,
    '--dash-duration': `${config.timing.dash}ms`,
    '--impact-duration': `${config.timing.impact}ms`,
    '--recoil-duration': `${config.timing.recoil}ms`,
  } as CSSProperties;

  return <div className="enemy-figure">
    <EnemyVitals enemy={enemy} />
    <div ref={anchor} className="enemy-image-anchor">
      <div
        ref={strike}
        id={(activeEnemyId ? active : selected) ? 'battle-enemy-target' : undefined}
        className="enemy-strike"
        data-stage={stage}
        data-defeated={enemy.hp <= 0}
        style={motionStyle}
      >
        {attack && <EnemyStrikeEffects src={appearance.src} strength={strength} />}
        <div ref={body} className="enemy-hit-body">
          <button
            type="button"
            className="enemy-target"
            onClick={() => selectEnemy(enemy.id)}
            disabled={!canSelect}
            aria-pressed={selected}
            aria-label={`選擇目標：${enemy.name}`}
          >
            <img
              className="enemy-image"
              src={appearance.src}
              width={appearance.width}
              height={appearance.height}
              alt={enemy.name}
              draggable={false}
            />
            <span
              ref={flash}
              className="enemy-hit-flash"
              style={{
                maskImage: `url("${appearance.src}")`,
                backgroundColor: ENEMY_PRESENTATION.hit.flashColor,
              }}
            />
          </button>
        </div>
      </div>
      {selected && <Crosshair className="enemy-target-marker" aria-label="本回合目標" />}
    </div>
    <DamagePopLayer anchorRef={strike} pops={damagePops.filter(pop => pop.enemyId === enemy.id)} />
  </div>;
}
