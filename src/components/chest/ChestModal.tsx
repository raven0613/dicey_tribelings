import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ALL_EQUIPMENT_CATALOG } from '../../configs/gameConfig';
import { Equipment } from '../../types/game';
import { soundService } from '../../service/audio/soundService';
import { FlyingRelicBadge } from './FlyingRelicBadge';
import { Gift, Sparkles, Coins, Check, ArrowRight, Flame, Zap, RotateCcw, Layers, ShieldAlert, Wind } from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Flame,
  RotateCcw,
  Zap,
  Sparkles,
  FlameKindling: Flame,
  Wind,
  ShieldAlert,
  Layers,
};

const RARITY_LABELS: Record<string, { label: string; class: string }> = {
  common: { label: '普通', class: 'common' },
  rare: { label: '稀有', class: 'rare' },
  epic: { label: '史詩', class: 'epic' },
  legendary: { label: '傳奇', class: 'legendary' },
};

export const ChestModal: React.FC = () => {
  const { mapNodes, currentNodeIndex, equipments, claimChestReward } = useGameStore();
  const currentNode = mapNodes[currentNodeIndex];

  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [relicOptions, setRelicOptions] = useState<Equipment[]>([]);
  const [selectedEquipId, setSelectedEquipId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [flyingData, setFlyingData] = useState<{
    equip: Equipment;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
  } | null>(null);

  // Reset state on node change
  useEffect(() => {
    setIsOpened(false);
    setRelicOptions([]);
    setSelectedEquipId(null);
    setIsProcessing(false);
    setFlyingData(null);
  }, [currentNodeIndex]);

  if (!currentNode || currentNode.type !== 'chest' || currentNode.completed) return null;

  // Handle open chest: roll 3 equipment choices
  const handleOpenChest = () => {
    soundService.playCoin();
    const ownedIds = new Set(equipments.map((e) => e.id));
    const unowned = ALL_EQUIPMENT_CATALOG.filter((e) => !ownedIds.has(e.id));
    const pool = unowned.length >= 3 ? unowned : ALL_EQUIPMENT_CATALOG;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setRelicOptions(shuffled.slice(0, 3));
    setIsOpened(true);
  };

  // Handle pick relic with fly-down animation
  const handleSelectRelic = (equip: Equipment) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setSelectedEquipId(equip.id);

    // Calculate source rect from card element
    const cardEl = document.getElementById(`chest-relic-${equip.id}`);
    const cardRect = cardEl
      ? cardEl.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };

    const startX = cardRect.left + cardRect.width / 2;
    const startY = cardRect.top + cardRect.height / 2;

    // Calculate destination rect: next empty slot in EquipmentBar
    const targetSlotIndex = Math.min(equipments.length, 4);
    const targetEl =
      document.getElementById(`equipment-slot-${targetSlotIndex}`) ||
      document.getElementById('equipment-slots-container');

    const targetRect = targetEl
      ? targetEl.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight - 70, width: 0, height: 0 };

    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    setFlyingData({
      equip,
      startX,
      startY,
      targetX,
      targetY,
    });
  };

  // Callback when relic arrives at the equipment slot
  const handleArrival = () => {
    soundService.playEquip();

    // Flash the target slot
    const targetSlotIndex = Math.min(equipments.length, 4);
    const targetEl = document.getElementById(`equipment-slot-${targetSlotIndex}`);
    if (targetEl) {
      targetEl.classList.add('slot-just-received');
      setTimeout(() => targetEl.classList.remove('slot-just-received'), 700);
    }

    // Short buffer to let user witness the item settling into the bar
    setTimeout(() => {
      if (flyingData) {
        claimChestReward(flyingData.equip);
      }
    }, 240);
  };

  return (
    <div className="chest-wrapper">
      <div className={`chest-card ${isOpened ? 'opened' : ''}`}>
        {/* Header Icon */}
        <div className="chest-icon-box">
          <Gift size={36} />
        </div>

        {/* Title and Intro */}
        <div className="chest-info">
          <div className="chest-title">{currentNode.title}</div>
          <div className="chest-desc">
            {!isOpened
              ? '你在冒險途中發現了一座古老神秘的寶箱！裡面蘊藏著豐厚金幣與隨機稀有裝備遺物。'
              : '寶箱已解開！獲得 25 金幣，請挑選 1 件珍稀遺物直接裝備至下方槽位：'}
          </div>
        </div>

        {/* Unopened View: Button to open */}
        {!isOpened ? (
          <>
            <div className="chest-rewards-preview">
              <div className="reward-item gold">
                <Coins size={18} color="#fbbf24" />
                <span>+25 金幣</span>
              </div>
              <span className="dot-separator">•</span>
              <div className="reward-item equip">
                <Sparkles size={18} color="#818cf8" />
                <span>珍稀遺物（三選一）</span>
              </div>
            </div>

            <button
              id="btn-open-chest"
              onClick={handleOpenChest}
              className="btn-open-chest"
            >
              <Gift size={18} />
              <span>開啟寶箱並選擇遺物</span>
              <ArrowRight size={18} />
            </button>
          </>
        ) : (
          /* Opened View: 3 Relics Pick-One Grid */
          <div className="chest-pick-section">
            <div className="chest-relics-grid">
              {relicOptions.map((equip) => {
                const IconComponent = ICON_MAP[equip.iconName] || Sparkles;
                const rarityInfo = RARITY_LABELS[equip.rarity] || RARITY_LABELS.common;
                const isSelected = selectedEquipId === equip.id;
                const isOther = selectedEquipId !== null && !isSelected;

                return (
                  <div
                    key={equip.id}
                    id={`chest-relic-${equip.id}`}
                    onClick={() => !isProcessing && handleSelectRelic(equip)}
                    className={`chest-relic-card ${rarityInfo.class} ${isSelected ? 'selected' : ''} ${
                      isOther ? 'dimmed' : ''
                    } ${isProcessing ? 'locked' : ''}`}
                  >
                    <div className="card-top-row">
                      <span className={`rarity-tag ${rarityInfo.class}`}>{rarityInfo.label}</span>
                      <span className="type-tag">
                        {equip.type === 'pattern' ? '組合' : equip.type === 'control' ? '控制' : '全局'}
                      </span>
                    </div>

                    <div className="card-icon-center">
                      <div className="icon-disc">
                        <IconComponent size={28} />
                      </div>
                    </div>

                    <div className="card-name">{equip.name}</div>
                    <div className="card-description">{equip.description}</div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      className="btn-select-relic"
                    >
                      {isSelected ? (
                        <>
                          <Check size={14} />
                          <span>已選擇・移動中</span>
                        </>
                      ) : (
                        <span>挑選此遺物</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="chest-tip-footer">
              <Sparkles size={14} color="#fbbf24" />
              <span>點擊心儀的遺物，將自動移入下方遺物槽位生效！</span>
            </div>
          </div>
        )}
      </div>

      {/* Fly-down Relic Portal Animation */}
      {flyingData && (
        <FlyingRelicBadge
          equip={flyingData.equip}
          startX={flyingData.startX}
          startY={flyingData.startY}
          targetX={flyingData.targetX}
          targetY={flyingData.targetY}
          onArrive={handleArrival}
        />
      )}
    </div>
  );
};
