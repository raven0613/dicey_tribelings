import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { REGION_CONFIG, REGION_IDS } from '../../configs/regions/regionConfig';
import './mapRoutes.scss';
import { RouteConnector } from './RouteConnector';
import { MapRouteNode } from './MapRouteNode';
import { Coins, Volume2, VolumeX } from 'lucide-react';

export const MapProgress: React.FC = () => {
  const { mapNodes, currentNodeIndex, routeChoices, chooseRoute, toggleSound, soundMuted, gold } = useGameStore();
  const region = mapNodes[currentNodeIndex].region;
  const nodes = mapNodes.filter((node) => node.region === region);
  const depths = [...new Set(nodes.map((node) => node.regionNode))].sort((a, b) => a - b);
  const currentRegion = REGION_IDS.find(id => id === region) ?? 1;

  return <nav className="region-progress" aria-label="救援路線">
    <div className="region-route">

      <span key={currentRegion} aria-current={'step'}>
        {REGION_CONFIG[currentRegion].name}
      </span>
    </div>

    <div className="region-map">
      {depths.map((depth, index) => <React.Fragment key={depth}>
        <div className="region-map-column">{nodes.filter((node) => node.regionNode === depth).map((node) =>
          <MapRouteNode key={node.id} node={node} selectable={routeChoices.includes(node.id)} onChoose={chooseRoute} />
        )}</div>
        {index < depths.length - 1 && <RouteConnector split={nodes.filter((node) => node.regionNode === depths[index + 1]).length > 1}
          merge={nodes.filter((node) => node.regionNode === depth).length > 1} />}
      </React.Fragment>)}
    </div>

    <div className='nav__info'>
      <span className="nav__gold"><Coins size={18} />{gold} 金幣</span>

      <button type="button" id="btn-toggle-sound" onClick={toggleSound}
        aria-label={soundMuted ? '開啟音效' : '靜音'} aria-pressed={soundMuted}>
        {soundMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </div>
  </nav>;
};
