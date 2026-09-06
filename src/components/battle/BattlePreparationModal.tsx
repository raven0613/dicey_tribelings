import { getDiceGeometry } from '../../service/dice/diceGeometry';
import React, { useEffect, useMemo, useState } from 'react';
import { Play, Sparkles, X } from 'lucide-react';
import { TemporaryStickerPlacement } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { CreatureBadge } from '../dice/CreatureBadge';

export const BattlePreparationModal: React.FC = () => {
  const {
    combatPhase,
    currentEnemy,
    dicePool,
    consumableStickers,
    unlockedDiceNotification,
    confirmBattlePreparation,
  } = useGameStore();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<TemporaryStickerPlacement[]>([]);

  useEffect(() => {
    if (combatPhase === 'PREPARATION') {
      setSelectedInstanceId(null);
      setPlacements([]);
    }
  }, [combatPhase, currentEnemy?.id]);

  const selectedConsumable = consumableStickers.find((item) => item.instanceId === selectedInstanceId);
  const placementByFace = useMemo(
    () => new Map(placements.map((item) => [`${item.diceId}:${item.faceIndex}`, item])),
    [placements]
  );

  if (combatPhase !== 'PREPARATION' || !currentEnemy || unlockedDiceNotification) return null;

  const assignFace = (diceId: string, faceIndex: number) => {
    if (!selectedConsumable) return;
    setPlacements((current) => [
      ...current.filter((item) =>
        item.consumable.instanceId !== selectedConsumable.instanceId
        && `${item.diceId}:${item.faceIndex}` !== `${diceId}:${faceIndex}`
      ),
      { consumable: selectedConsumable, diceId, faceIndex },
    ]);
    setSelectedInstanceId(null);
  };

  const unassign = (instanceId: string) => {
    setPlacements((current) => current.filter((item) => item.consumable.instanceId !== instanceId));
  };

  return (
    <div className="modal-overlay">
      <div className="battle-preparation-card">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge"><Sparkles size={20} /></div>
            <div className="modal-title-box">
              <div className="modal-title">戰前準備：{currentEnemy.name}</div>
              <div className="modal-subtitle">可配置任意張戰術貼紙；每張占用一個不同骰面，效果維持整場戰鬥。</div>
            </div>
          </div>
        </div>

        <div className="preparation-layout">
          <section className="preparation-consumables">
            <h3>1. 選擇戰術貼紙</h3>
            {consumableStickers.length === 0 && <p className="empty-message">目前沒有戰術貼紙，可以直接開始戰鬥。</p>}
            {consumableStickers.map((item) => {
              const assigned = placements.find((placement) => placement.consumable.instanceId === item.instanceId);
              return (
                <div className={`preparation-consumable ${selectedInstanceId === item.instanceId ? 'selected' : ''}`} key={item.instanceId}>
                  <button type="button" onClick={() => setSelectedInstanceId(item.instanceId)}>
                    <strong>{item.baseValue}</strong>
                    <span>{item.name}</span>
                    <CreatureBadge creature={item.creature} />
                  </button>
                  {assigned && (
                    <button type="button" className="unassign-button" onClick={() => unassign(item.instanceId)} aria-label={`取消配置 ${item.name}`}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </section>

          <section className="preparation-faces">
            <h3>2. 選擇目標骰面</h3>
            <div className="preparation-dice-list">
              {dicePool.map((die) => (
                <div className="preparation-die" key={die.id}>
                  <h4>{die.name}</h4>
                  <div className="preparation-face-grid">
                    {die.faces.map((face, faceIndex) => {
                      const placement = placementByFace.get(`${die.id}:${faceIndex}`);
                      return (
                        <button
                          type="button"
                          key={face.id}
                          disabled={!selectedConsumable}
                          onClick={() => assignFace(die.id, faceIndex)}
                          className={placement ? 'assigned' : ''}
                        >
                          <span>第 {faceIndex + 1} 面</span>
                          <strong>{placement?.consumable.baseValue ?? face.baseValue}</strong>
                          <CreatureBadge creature={placement?.consumable.creature ?? face.creature} size={10} />
                          <small>相鄰面：{getDiceGeometry(die.dieType)[faceIndex].neighbors.map((index) => index + 1).join("、")}</small>
                          {placement && <small>{placement.consumable.name}</small>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <button type="button" className="btn-primary-modal" onClick={() => confirmBattlePreparation(placements)}>
          <Play size={16} />開始戰鬥（使用 {placements.length} 張）
        </button>
      </div>
    </div>
  );
};
