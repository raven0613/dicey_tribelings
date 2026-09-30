import { Swords, Gift, Store, Skull, Crown, Flame } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { MapNode, MapNodeType } from '../../types/game';
import { MONSTER_CONFIG } from '../../configs/monsters/monsterConfig';
import { MONSTER_FEATURE_NAMES, MONSTER_RANK_COLORS } from '../../configs/monsters/monsterPresentationConfig';
import { MAP_PRESENTATION } from '../../configs/regions/mapPresentationConfig';
import { useSkillTooltip } from '../common/useSkillTooltip';
import { describeEncounter } from '../../service/regions/encounterDescription';

const icons = { fight: Swords, chest: Gift, shop: Store, elite: Skull, boss: Crown, camp: Flame } satisfies Record<MapNodeType, typeof Swords>;
interface MapRouteNodeProps {
  node: MapNode;
  selectable: boolean;
  onChoose: (id: number) => void;
}

export function MapRouteNode({ node, selectable, onChoose }: MapRouteNodeProps) {
  const enemies = (node.enemyIds ?? []).map(id => MONSTER_CONFIG.find(enemy => enemy.id === id)!);
  const encounter = describeEncounter(enemies);
  const title = enemies.length ? encounter.title : node.title;
  const monster = enemies[0];
  const Icon = icons[node.type];
  const { labels, rewards, locationColors, detailColor, iconSize, minimumIconSizeEm } = MAP_PRESENTATION;
  const color = node.type === 'shop' || node.type === 'camp' || node.type === 'chest'
    ? locationColors[node.type] : MONSTER_RANK_COLORS[monster!.rank];
  const reward = monster?.rank === 'final_boss' ? rewards.finalBoss : rewards[node.type];
  const status = node.skipped ? labels.skipped : node.completed ? labels.completed : '';
  const content = <div className="map-node-details" style={{ color: detailColor }}>
    <strong style={{ color }}>{title}</strong>
    <span>{labels.reward}：{reward}</span>
    {encounter.groups.map(group => <span key={group.name} style={{ color: MONSTER_RANK_COLORS[group.rank] }}>
      {group.name}・{labels.features}：{group.features.map(id => MONSTER_FEATURE_NAMES[id]).join('、')}
    </span>)}
    {status && <span>{status}</span>}
  </div>;
  const { tooltip, tooltipProps } = useSkillTooltip(content);
  const className = ['region-map-node', node.current && 'current', node.completed && 'completed',
    node.skipped && 'skipped', selectable && 'selectable'].filter(Boolean).join(' ');
  const icon = <Icon className="map-node-icon" aria-hidden="true" />;
  const style = { color, '--map-icon-size': `max(${iconSize}px, calc(var(--minimum-font-size) * ${minimumIconSizeEm}))` } as CSSProperties;

  return <>
    {selectable ? <button type="button" className={className} style={style} {...tooltipProps}
      aria-label={`${labels.choose} ${title}`} onClick={() => onChoose(node.id)}>{icon}</button>
      : <div className={className} style={style} {...tooltipProps} tabIndex={0} aria-label={title}
        aria-current={node.current ? 'step' : undefined}>{icon}</div>}
    {tooltip}
  </>;
}
