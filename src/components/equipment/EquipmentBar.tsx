import { getActionTargets, getEquipmentAction } from '../../service/battle/rollService';
import { SkillText } from '../common/SkillText';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/gameStore';
import type { Equipment, EquipmentRarity } from '../../types/game';
import { INITIAL_PLAYER_STATS } from '../../configs/gameConfig';
import { Zap } from 'lucide-react';
import { SkillFeedback } from '../battle/SkillFeedback';
import { getEquipmentIcon } from './equipmentIcons';

const RARITY_LABELS: Record<EquipmentRarity, string> = {
  common: '普通',
  rare: '稀有',
  legendary: '傳奇',
};

export const EquipmentBar: React.FC = () => {
  const {
    equipments,
    comboSummary,
    skillFeedback,
    combatPhase,
    currentEnemy,
    activeRerollingIndex,
    equipmentSlotFeedback, diceAction, setDiceAction, setHoveredEquipment,
  } = useGameStore();
  const maxSlots = INITIAL_PLAYER_STATS.maxEquipmentSlots;
  const [receivedSlotIndex, setReceivedSlotIndex] = useState<number | null>(null);

  const [hoveredEquip, setHoveredEquip] = useState<{
    equip: Equipment;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    setHoveredEquipment(hoveredEquip?.equip.id ?? null);
    return () => setHoveredEquipment(null);
  }, [hoveredEquip, setHoveredEquipment]);

  // Dismiss on window scroll or resize so floating tooltip never gets misaligned
  useEffect(() => {
    const handleDismiss = () => setHoveredEquip(null);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, []);

  useEffect(() => {
    if (!equipmentSlotFeedback) return;
    setReceivedSlotIndex(equipmentSlotFeedback.slotIndex);
    const timerId = window.setTimeout(() => setReceivedSlotIndex(null), 850);
    return () => window.clearTimeout(timerId);
  }, [equipmentSlotFeedback]);

  const triggeredEquipmentIds = new Set(currentEnemy && activeRerollingIndex === null
    ? combatPhase === 'CONTROL_PHASE' ? comboSummary?.triggeredEquipmentIds ?? []
      : skillFeedback.flatMap(({ event }) => event.equipmentId ? [event.equipmentId] : [])
    : []);

  return (
    <div className="equipment-bar">
      <div className="slots-grid" id="equipment-slots-container">
        {Array.from({ length: maxSlots }).map((_, idx) => {
          const equip = equipments[idx];
          if (!equip) {
            return (
              <div
                key={idx}
                id={`equipment-slot-${idx}`}
                className="slot-empty"
              >
                <span>槽位 {idx + 1}</span>
                <span className="empty-sub">空</span>
              </div>
            );
          }

          const IconComponent = getEquipmentIcon(equip.iconName);
          const isSelected = hoveredEquip?.equip.id === equip.id;
          const isTriggered = triggeredEquipmentIds.has(equip.id);
          const action = getEquipmentAction(equip.ruleId);
          const selecting = action?.action === diceAction;
          const canActivate = !!action && activeRerollingIndex === null
            && getActionTargets(action.action, useGameStore.getState()).length > 0;
          const isJustReceived = receivedSlotIndex === idx;

          return (
            <div
              key={equip.id}
              id={`equipment-slot-${idx}`}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredEquip({ equip, rect });
              }}
              onMouseLeave={() => setHoveredEquip(null)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredEquip((prev) => (prev?.equip.id === equip.id ? null : { equip, rect }));
              }}
              aria-label={equip.name}
              tabIndex={0}
              onFocus={(e) => setHoveredEquip({ equip, rect: e.currentTarget.getBoundingClientRect() })}
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHoveredEquip(null); }}
              className={`slot-occupied ${action ? 'has-action' : ''} ${isSelected ? 'selected' : ''} ${isTriggered ? 'pattern-triggered' : ''} ${isJustReceived ? 'slot-just-received' : ''}`}
            >
              <SkillFeedback diceId={equip.id} feedback={skillFeedback} />
              {/* Type color accent */}
              <div className={`accent-stripe ${equip.type}`} />

              <div className="slot-icon-box">
                <IconComponent style={{ width: '16px', height: '16px' }} />
              </div>

              {action && <button type="button" className="equipment-action"
                disabled={!selecting && !canActivate} aria-pressed={selecting}
                aria-label={selecting ? `取消${action.label}` : `${action.label} ${action.cost} ${action.currency}`}
                title={`${action.label} ${action.cost} ${action.currency}`}
                onClick={(event) => { event.stopPropagation(); setDiceAction(selecting ? 'reroll' : action.action); }}>
                {selecting ? '取消' : action.label}
              </button>}
              {isTriggered && !action && (
                <span className="equipment-trigger-badge">
                  <Zap size={9} />
                  發動
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Slot details use the available space above or below the anchor. */}
      {hoveredEquip &&
        typeof document !== 'undefined' &&
        (() => {
          const { equip, rect } = hoveredEquip;
          const tooltipWidth = Math.min(288, window.innerWidth - 24);
          const above = rect.top >= window.innerHeight - rect.bottom;
          const centerX = rect.left + rect.width / 2;
          const left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, centerX - tooltipWidth / 2));
          const maxHeight = (above ? rect.top : window.innerHeight - rect.bottom) - 22;
          const action = getEquipmentAction(equip.ruleId);

          const rarityLabel = RARITY_LABELS[equip.rarity];
          const IconComponent = getEquipmentIcon(equip.iconName);

          return createPortal(
            <div
              className="animate-fadeIn"
              style={{
                position: 'fixed',
                zIndex: 99999,
                pointerEvents: 'none',
                transition: 'all 0.15s ease',
                left: `${left}px`,
                ...(above ? { bottom: window.innerHeight - rect.top + 10 } : { top: rect.bottom + 10 }),
                width: `${tooltipWidth}px`,
                maxHeight: `${maxHeight}px`,
                overflowY: 'auto',
              }}
            >
              <div className="equip-tooltip-box">
                {/* Header */}
                <div className="tooltip-header">
                  <div className="title-row">
                    <div style={{ padding: '4px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d' }}>
                      <IconComponent style={{ width: '16px', height: '16px' }} />
                    </div>
                    <span className="tooltip-name">{equip.name}</span>
                  </div>
                  <span className={`rarity-pill ${equip.rarity}`}>
                    {rarityLabel}
                  </span>
                </div>

                {/* Subtitle / Type */}
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#a5b4fc', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#818cf8', display: 'inline-block' }} />
                  <span>
                    類型：
                    {equip.type === 'pattern'
                      ? '骰面組合'
                      : equip.type === 'control'
                        ? 'Control 補救與戰術機制'
                        : '全局共鳴被動'}
                  </span>
                </div>

                {/* Description */}
                <p className="tooltip-desc">
                  <SkillText text={equip.description} />
                </p>

                {action && <p className="tooltip-desc">
                  {action.label}：{action.cost} {action.currency}
                </p>}

              </div>
            </div>,
            document.body
          );
        })()}
    </div>
  );
};
