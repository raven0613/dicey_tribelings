import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Swords, Gift, Store, Skull, Crown, Check, ChevronRight } from 'lucide-react';
import { REGION_CONFIG, REGION_IDS } from '../../configs/regions/regionConfig';
import type { MapNodeType } from '../../types/game';

const icons = { fight: Swords, chest: Gift, pack: Gift, shop: Store, elite: Skull, boss: Crown } satisfies Record<MapNodeType, typeof Swords>;
export const MapProgress: React.FC = () => {
  const { mapNodes, currentNodeIndex } = useGameStore();
  const region = mapNodes[currentNodeIndex].region;
  const nodes = mapNodes.filter((node) => node.region === region);
  return <nav className="region-progress" aria-label="救援路線">
    <div className="region-route">{REGION_IDS.map((id) => <span key={id} aria-current={id === region ? 'step' : undefined}>
      {id < region ? '✓ ' : ''}{id}．{REGION_CONFIG[id].name}
    </span>)}</div>
    <div className="map-progress-container">
      {nodes.map((node, index) => {
        const completed = node.completed || node.id < currentNodeIndex;
        const Icon = completed ? Check : icons[node.type];
        return <React.Fragment key={node.id}>
          <div className={`map-node-pill ${node.id === currentNodeIndex ? 'current' : completed ? 'completed' : 'upcoming'}`}
            aria-current={node.id === currentNodeIndex ? 'step' : undefined}>
            <Icon size={18} /><span className="node-title">{node.title}</span>
          </div>
          {index < nodes.length - 1 && <ChevronRight size={16} className="node-divider" />}
        </React.Fragment>;
      })}
    </div>
  </nav>;
};
