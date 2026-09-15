import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { REGION_CONFIG, REGION_IDS } from '../../configs/regions/regionConfig';
import { ROUTE_CONFIG } from '../../configs/regions/mapConfig';
import './mapRoutes.scss';
import { RouteConnector } from './RouteConnector';
import { MapRouteNode } from './MapRouteNode';

export const MapProgress: React.FC = () => {
  const { mapNodes, currentNodeIndex, routeChoices, chooseRoute } = useGameStore();
  const region = mapNodes[currentNodeIndex].region;
  const nodes = mapNodes.filter((node) => node.region === region);
  const depths = [...new Set(nodes.map((node) => node.regionNode))].sort((a, b) => a - b);
  return <nav className="region-progress" aria-label="救援路線">
    <div className="region-route">{REGION_IDS.map((id) => <span key={id} aria-current={id === region ? 'step' : undefined}>
      {id < region ? '✓ ' : ''}{id}．{REGION_CONFIG[id].name}
    </span>)}</div>
    {routeChoices.length > 0 && <h3>{ROUTE_CONFIG.choose}</h3>}
    <div className="region-map">
      {depths.map((depth, index) => <React.Fragment key={depth}>
        <div className="region-map-column">{nodes.filter((node) => node.regionNode === depth).map((node) =>
          <MapRouteNode key={node.id} node={node} selectable={routeChoices.includes(node.id)} onChoose={chooseRoute} />
        )}</div>
        {index < depths.length - 1 && <RouteConnector split={nodes.filter((node) => node.regionNode === depths[index + 1]).length > 1}
          merge={nodes.filter((node) => node.regionNode === depth).length > 1} />}
      </React.Fragment>)}
    </div>
  </nav>;
};
