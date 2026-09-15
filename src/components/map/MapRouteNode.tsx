import { Swords, Gift, Store, Skull, Crown } from 'lucide-react';
import type { MapNode, MapNodeType } from '../../types/game';
import { MONSTER_CONFIG } from '../../configs/monsters/monsterConfig';
import { MONSTER_FEATURE_NAMES, MONSTER_RANK_COLORS } from '../../configs/monsters/monsterPresentationConfig';
import { MAP_PRESENTATION } from '../../configs/regions/mapPresentationConfig';
import { useSkillTooltip } from '../common/useSkillTooltip';

const icons = { fight: Swords, chest: Gift, pack: Gift, shop: Store, elite: Skull, boss: Crown } satisfies Record<MapNodeType, typeof Swords>;
interface MapRouteNodeProps {
  node: MapNode;
  selectable: boolean;
  onChoose: (id: number) => void;
}

export function MapRouteNode({ node, selectable, onChoose }: MapRouteNodeProps) {
  const monster = MONSTER_CONFIG.find((enemy) => enemy.id === node.enemyId);
  const Icon = icons[node.type];
  const { labels, rewards } = MAP_PRESENTATION;
  const reward = monster?.rank === 'final_boss' ? rewards.finalBoss : rewards[node.type];
  const features = monster?.mapFeatures.map((id) => MONSTER_FEATURE_NAMES[id]).join('、');
  const content = [node.title, `${labels.reward}：${reward}`, features && `${labels.features}：${features}`,
    node.skipped ? labels.skipped : node.completed ? labels.completed : ''].filter(Boolean).join('\n');
  const { tooltip, tooltipProps } = useSkillTooltip(content);
  const className = ['region-map-node', node.current && 'current', node.completed && 'completed',
    node.skipped && 'skipped', selectable && 'selectable'].filter(Boolean).join(' ');
  const title = <><Icon size={16} aria-hidden="true" /><span style={monster ? { color: MONSTER_RANK_COLORS[monster.rank] } : undefined}>{node.title}</span></>;

  return <>
    {selectable ? <button type="button" className={className} {...tooltipProps}
      aria-label={`${labels.choose} ${node.title}`} onClick={() => onChoose(node.id)}>{title}</button>
      : <div className={className} {...tooltipProps} tabIndex={0}
        aria-current={node.current ? 'step' : undefined}>{title}</div>}
    {tooltip}
  </>;
}
