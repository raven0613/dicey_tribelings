import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Swords, Gift, Store, Skull, Crown, Check, ChevronRight } from 'lucide-react';

export const MapProgress: React.FC = () => {
  const { mapNodes, currentNodeIndex } = useGameStore();

  const getNodeIcon = (type: string, isBoss?: boolean, isElite?: boolean) => {
    switch (type) {
      case 'fight':
        return <Swords className="w-3.5 h-3.5" />;
      case 'elite':
        return <Skull className="w-3.5 h-3.5 text-purple-400" />;
      case 'boss':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'chest':
        return <Gift className="w-3.5 h-3.5 text-amber-300" />;
      case 'shop':
        return <Store className="w-3.5 h-3.5 text-emerald-300" />;
      default:
        return <Swords className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="map-progress-container">
      {mapNodes.map((node, idx) => {
        const isCompleted = idx < currentNodeIndex;
        const isCurrent = idx === currentNodeIndex;

        const nodeClass = isCurrent
          ? 'map-node-pill current'
          : isCompleted
          ? 'map-node-pill completed'
          : 'map-node-pill upcoming';

        return (
          <React.Fragment key={node.id}>
            <div className={nodeClass}>
              {isCompleted ? (
                <Check style={{ width: '14px', height: '14px', color: '#34d399' }} />
              ) : (
                getNodeIcon(node.type)
              )}
              <span className="node-title">{node.title}</span>
            </div>

            {idx < mapNodes.length - 1 && (
              <ChevronRight
                className={`node-divider ${idx < currentNodeIndex ? 'past' : 'future'}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
