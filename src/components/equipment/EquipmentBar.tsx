import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/gameStore';
import { Equipment } from '../../types/game';
import { INITIAL_PLAYER_STATS } from '../../configs/gameConfig';
import { Sparkles, Flame, Zap, RotateCcw, Layers, ShieldAlert, Wind } from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Flame,
  RotateCcw,
  Zap,
  Sparkles,
  FlameKindling: Flame,
  Wind,
  ShieldAlert,
  Layers,
};

const RARITY_MAP: Record<string, { label: string; badge: string }> = {
  common: { label: '普通', badge: 'bg-slate-800 text-slate-300 border-slate-600' },
  rare: { label: '稀有', badge: 'bg-blue-950/80 text-blue-300 border-blue-500/60' },
  epic: { label: '史詩', badge: 'bg-purple-950/80 text-purple-300 border-purple-500/60' },
  legendary: { label: '傳奇', badge: 'bg-amber-950/80 text-amber-300 border-amber-500/80' },
};

export const EquipmentBar: React.FC = () => {
  const { equipments } = useGameStore();
  const maxSlots = INITIAL_PLAYER_STATS.maxEquipmentSlots;

  const [hoveredEquip, setHoveredEquip] = useState<{
    equip: Equipment;
    rect: DOMRect;
  } | null>(null);

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

  return (
    <div className="equipment-bar">
      <div className="bar-header">
        <span className="bar-title">
          <Sparkles style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
          裝備遺物槽位 ({equipments.length}/{maxSlots})
        </span>
        <span className="bar-tip">懸停或點擊槽位可檢視完整遺物技能效果</span>
      </div>

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

          const IconComponent = ICON_MAP[equip.iconName] || Sparkles;
          const isSelected = hoveredEquip?.equip.id === equip.id;

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
              className={`slot-occupied ${isSelected ? 'selected' : ''}`}
            >
              {/* Type color accent */}
              <div className={`accent-stripe ${equip.type}`} />

              <div className="slot-icon-box">
                <IconComponent style={{ width: '16px', height: '16px' }} />
              </div>

              <div className="slot-text-box">
                <div className="equip-name">{equip.name}</div>
                <div className="equip-type">
                  {equip.type === 'pattern' ? '組合' : equip.type === 'control' ? '控制' : '被動'} 遺物
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Portal Tooltip: rendered on document.body strictly ABOVE the equipment slot so it is never clipped or blocked */}
      {hoveredEquip &&
        typeof document !== 'undefined' &&
        (() => {
          const { equip, rect } = hoveredEquip;
          const tooltipWidth = 288;
          const centerX = rect.left + rect.width / 2;
          const left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, centerX - tooltipWidth / 2));
          const arrowLeft = Math.max(16, Math.min(tooltipWidth - 24, centerX - left - 6));
          // Always position strictly above the slot with bottom anchoring
          const bottom = Math.max(10, window.innerHeight - rect.top + 10);
          const maxHeight = Math.max(160, rect.top - 20);

          const rarityLabel = RARITY_MAP[equip.rarity]?.label || equip.rarity;
          const IconComponent = ICON_MAP[equip.iconName] || Sparkles;

          return createPortal(
            <div
              className="animate-fadeIn"
              style={{
                position: 'fixed',
                zIndex: 99999,
                pointerEvents: 'none',
                transition: 'all 0.15s ease',
                left: `${left}px`,
                bottom: `${bottom}px`,
                width: `${tooltipWidth}px`,
                maxHeight: `${maxHeight}px`,
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
                      ? '骰面 Pattern 組合'
                      : equip.type === 'control'
                      ? 'Control 補救與戰術機制'
                      : '全局共鳴被動'}
                  </span>
                </div>

                {/* Description */}
                <p className="tooltip-desc">
                  {equip.description}
                </p>

                {/* Direction Arrow strictly pointing down toward slot */}
                <div
                  className="tooltip-arrow"
                  style={{ left: `${arrowLeft}px` }}
                />
              </div>
            </div>,
            document.body
          );
        })()}
    </div>
  );
};
